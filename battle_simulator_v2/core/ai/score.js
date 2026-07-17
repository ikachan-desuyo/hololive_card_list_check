/**
 * 選択肢スコアラ（AIと「評価値表示」の単一の物差し）
 *
 * 現在の決定ポイント（engine.state.pending）の各選択肢に、idx 視点の数値を付ける。
 *   - CPU: この数値が最大の選択肢を選ぶ（heuristic.js）
 *   - 人間向け表示: UIが同じ数値をカード上にオーバーレイ表示する（設定でON）
 *
 * スコアは「その行動でどれだけ得をするか」の見積り（Δ評価の近似）。盤面評価の部品
 * （evaluate.js）を共通の単位として使う。完全な先読み（手を適用して再評価）は状態の
 * 複製が難しいため行わず、行動種別ごとに効果を見積もる方式（アタックなど複製不要なものは
 * ほぼ厳密、効果系は概算＋カード固有ヒント ai.* で補う）。
 *
 * 公平性: 公開情報のみ（相手の手札/山札の中身・順序は見ない）。
 */

import { maxArtDmg, incomingDamageToCenter, unmetCost, cheerBudgetThisTurn, opponentExtraCheerProjection } from './evaluate.js';
import { planLineBonus, planNeedsColor, gamePlanOf } from './gameplan.js';

/** 今のエールで撃てるアーツの最大実効火力（dmgBonus/枚数依存込み）。攻撃要員としての即戦力。 */
function bestPayableEffDmg(engine, h, idx) {
  if (!h) return 0;
  let d = 0;
  for (const a of (h.stack[0].arts || [])) {
    if (engine._canPayCheers(h.cheers, a.cost)) d = Math.max(d, engine._artEffectiveDamage(h, a, idx));
  }
  return d;
}

/** ホロメン（カード）の基礎評価: HP＋アーツ火力 */
export function holomenValue(card) {
  if (!card || card.kind !== 'holomen') return 0;
  return (card.hp || 0) + maxArtDmg(card) * 0.5;
}

/** 手札に残す価値（ペナルティで戻す時は低い順に捨てる）。デッキプロファイルのキーカードは残す */
function cardKeepValue(card, engine = null, idx = -1) {
  let v = 10;
  if (card.kind === 'holomen') v = card.bloomLevel === 'Debut' ? 50 : 35;
  else if (card.kind === 'support') v = 25;
  if (engine && idx >= 0) {
    const prof = gamePlanOf(engine, idx).profile;
    if (prof?.keyCards?.includes(card.number)) v += 30; // テーマの要は手放さない
  }
  return v;
}

/** サポートカードの価値（デッキプロファイルのヒント ＞ カード定義 ai.supportValue ＞ テキスト汎用評価） */
function supportValue(engine, p, card) {
  const def = engine.registry.get(card.number);
  // デッキプロファイルの「使いどころ」ヒント（デッキ文脈はカード単体ヒントより強い）
  const prof = gamePlanOf(engine, engine.state.players.indexOf(p)).profile;
  const hint = prof?.supportHints?.[card.number];
  if (hint != null) return typeof hint === 'function' ? hint({ engine, player: p, card }) : hint;
  if (def?.ai?.supportValue) return def.ai.supportValue({ engine, player: p, card });
  const text = card.supportText || '';
  // 用途ゲート（ポケカAI Decision Gate の移植・ホロカ流に調整。docs/AI_REFERENCE_POKEMON.md ②）:
  // 引きずり出し系（相手のセンターとバックを交代させる。じゃあ敵だね等）の価値は
  //   ①引き出した相手を今KOできる（最高値）
  //   ②相手の育った（エールの乗った）センターを退かす妨害（KOできなくても価値あり）
  // の合成。どちらも無い早撃ちは温存する（LIMITED枠の浪費）。
  if (/相手の.*ホロメン.*交代/.test(text)) {
    const idx = engine.state.players.indexOf(p);
    const opp = engine.state.players[1 - idx];
    const fronts = [p.center, p.collab].filter(Boolean);
    const canKOPulled = (opp.back || []).some((b) => {
      const remain = engine.effectiveHp(b) - b.damage;
      if (remain <= 0) return false;
      return fronts.some((f) => !f.rested && (f.stack[0].arts || []).some((a) =>
        engine._canPayCheers(f.cheers, a.cost) && engine._artEffectiveDamage(f, a, idx, b.stack[0].color) >= remain));
    });
    if (canKOPulled) return 46;
    // 妨害価値: 相手センターの投資（エール枚数）が大きいほど、退かすテンポ価値が上がる
    const oppCenterCheers = opp.center ? (opp.center.cheers || []).length : 0;
    return Math.min(30, 8 + oppCenterCheers * 6);
  }
  let score = 12;
  if (/[\d１２３４５６７８９]枚引/.test(text)) score = 24 + Math.max(0, 6 - p.hand.length) * 3;
  if (/デッキから/.test(text) && /(手札に加える|公開し)/.test(text)) score = Math.max(score, 26);
  if (/ステージに出す/.test(text)) score = Math.max(score, engine._stageCount(p) < 4 ? 30 : 8);
  if (/交代/.test(text)) score = Math.max(score, 16);
  const sd = text.match(/特殊ダメージ(\d+)/); // 特殊ダメージ系は火力ぶん価値を上げる
  if (sd) score = Math.max(score, 18 + Number(sd[1]) * 0.4);
  if (/回復/.test(text)) score = Math.max(score, 14);
  // 手札リセット系（マネちゃん等「手札を…戻し…引く」）: 手札に「今すぐ使える装着カード」がある間は後回し
  // （2026-07 決定監査: 雪民を付ける前にマネちゃんで手札ごと流す順序ミスが観測された）
  if (/手札[^。]*(戻|引き直)/.test(text)) {
    const usableFirst = p.hand.some((c) => c !== card && c.kind === 'support'
      && ['ツール', 'マスコット', 'ファン'].includes(c.supportType)
      && engine._stageHolomems(p).some((h) => engine._canAttachSupport(h, c)));
    if (usableFirst) return 6;
  }
  return score;
}

/**
 * 「フリープレイ」= 発動にコスト/犠牲/デメリットが無く、ドロー/サーチで手札・情報を
 * 増やすだけの行動か。これらは引いた結果が他の判断を変えうるので「先に・必ず」打つべき。
 *   - カード定義 ai.freePlay があれば最優先で従う（明示指定）
 *   - 無ければテキストから汎用判定（ドロー/デッキサーチ かつ コスト語が無い）
 */
export function isFreePlaySupport(engine, card) {
  const def = engine.registry.get(card.number);
  if (!def?.support) return false; // 効果未実装は対象外（温存）
  if (def.ai?.freePlay != null) return !!def.ai.freePlay;
  const text = card.supportText || '';
  const gains = /[\d１２３４５６７８９]枚(引|ドロー)/.test(text)
    || (/デッキ(から|の中)/.test(text) && /(手札に加える|公開)/.test(text));
  if (!gains) return false;
  // コスト/犠牲/デメリットを示す語があればフリーではない
  const hasDownside = /(アーカイブ|捨て|ダウン|コスト|減ら|手札[^。]*戻|失う|エール[^。]*取り除|お休み|ホロパワー)/.test(text);
  return !hasDownside;
}

/**
 * 「デッキからホロメンをステージに出す」発展支援か（ふつうのパソコン等）。
 * place（手札Debutの展開）と同じく未来のアタッカーの土台を作る無条件の発展手＋デッキ圧縮になるので、
 * 先読みのノイズで取りこぼさず貪欲に使ってよい。ドロー/サーチ主体（=手札に引く＝デッキ切れの綱引きがある）は
 * 含めない（それらは先読みに weigh させる）。下振れ語のある支援も除外する。
 */
export function isDevelopSupport(engine, card) {
  const def = engine.registry.get(card.number);
  if (!def?.support) return false; // 効果未実装は対象外
  if (card.limited) return false;  // LIMITEDは1ターン1枚の枠を消費する→貪欲化しない（他の重要なLIMITED支援を潰さない）
  if (def.ai?.developSupport != null) return !!def.ai.developSupport; // カード定義で明示があれば従う
  const text = card.supportText || '';
  if (!/(ステージに出す|登場させ)/.test(text)) return false;
  if (/(引く|ドロー|手札に加える)/.test(text)) return false; // ドロー/サーチ主体は対象外
  const hasDownside = /(アーカイブ|捨て|ダウン|失う|エール[^。]*取り除|お休み|ホロパワー)/.test(text);
  return !hasDownside;
}

/** 効果テキストからおおまかな価値を推定する（ドロー/サーチ/特殊ダメージ/エール/回復/回収など） */
function estimateEffectText(text, engine, p) {
  if (!text) return 0;
  let v = 8; // 効果がある事自体の基礎点
  if (/[\d１２３４５６７８９]枚(引|ドロー)/.test(text)) v = Math.max(v, 22 + Math.max(0, 6 - p.hand.length) * 2);
  if (/デッキ(から|の中)/.test(text) && /(手札に加える|公開)/.test(text)) v = Math.max(v, 24);
  if (/ステージに出す|登場させる/.test(text)) v = Math.max(v, engine._stageCount(p) < 4 ? 26 : 8);
  const sd = text.match(/特殊ダメージ(\d+)/); if (sd) v = Math.max(v, 16 + Number(sd[1]) * 0.4);
  if (/エール/.test(text) && /(付ける|送る|アタッチ)/.test(text)) v = Math.max(v, 18);
  if (/回復/.test(text)) v = Math.max(v, 14);
  if (/(アーカイブから|手札に戻|回収)/.test(text)) v = Math.max(v, 16);
  return v;
}

/**
 * コラボエフェクトの価値（この形でコラボした時に得られる効果の見積り）。
 *   カード定義 ai.collabValue 優先 → 効果テキスト(コラボエフェクト)からの汎用推定 → フックのみある場合の保険(18)。
 */
function collabValueOf(engine, p, card, holomem) {
  const def = engine.registry.get(card.number);
  if (def?.ai?.collabValue) return def.ai.collabValue({ engine, player: p, card, holomem });
  const kw = (card.keywords || []).find((k) => /コラボ/.test(k.subtype || ''));
  if (kw) return estimateEffectText(kw.text, engine, p);
  return def?.collabEffect ? 18 : 0;
}

/**
 * 現在の決定ポイントの各選択肢に点数を付ける。
 * @returns {Object<string, number>} optionId -> score
 */
export function scoreOptions(engine, idx, pending = engine.state.pending) {
  const out = {};
  if (!pending) return out;
  const p = engine.state.players[idx];
  switch (pending.type) {
    case 'stepPause':
      out.ok = 1;
      break;
    case 'redraw': {
      const debuts = p.hand.filter((c) => c.kind === 'holomen' && c.bloomLevel === 'Debut');
      const wantRedraw = debuts.length <= 1; // Debut が1枚以下なら引き直す
      out.yes = wantRedraw ? 10 : 0;
      out.no = wantRedraw ? 0 : 10;
      break;
    }
    case 'placementCenter':
      for (const o of pending.options) {
        const card = p.hand[o.handIndex];
        let v = holomenValue(card);
        // コラボエフェクト持ちはバックに温存したい（コラボはバック→コラボ位置への移動で誘発するため、
        // センターに置くと活かせない）。同程度のステータスなら効果無しをセンターへ回す。
        if (engine.registry.get(card.number)?.collabEffect) v -= 25;
        // デッキプロファイルのセンター優先名（初期配置から持続アタッカーのラインをセンターに据える）
        const prefer = gamePlanOf(engine, idx).profile?.centerPreferNames;
        const names = [card.name, ...(card.nameAliases || [])];
        if (prefer?.some((n) => names.includes(n))) v += 30;
        out[o.id] = v;
      }
      break;
    case 'placementPenalty':
      for (const o of pending.options) out[o.id] = -cardKeepValue(p.hand[o.handIndex], engine, idx);
      break;
    case 'placementBack':
      for (const o of pending.options) {
        if (o.id === 'done') { out[o.id] = 0; continue; }
        const card = p.hand[o.handIndex];
        let v = holomenValue(card);
        if (engine.registry.get(card.number)?.collabEffect) v += 25; // コラボ候補はバックに置く
        out[o.id] = v;
      }
      break;
    case 'chooseCenter':
      for (const o of pending.options) {
        const h = p.back[o.backIndex];
        let v = h ? holomenValue(h.stack[0]) + engine.effectiveHp(h) - h.damage : -Infinity;
        // デッキプロファイルのセンター優先名（持続アタッカー/推しステージスキルの発動条件。
        // FUWAMOCO=モココ・ルイ系=鷹嶺ルイ等）。別名（としても扱う）にも一致させる
        if (h) {
          const prefer = gamePlanOf(engine, idx).profile?.centerPreferNames;
          const names = [h.stack[0].name, ...(h.stack[0].nameAliases || [])];
          if (prefer?.some((n) => names.includes(n))) v += 60;
        }
        out[o.id] = v;
      }
      break;
    case 'attachCheer':
    case 'attachLifeCheer':
      scoreCheerTargets(engine, idx, pending, out);
      break;
    case 'main':
      scoreMainActions(engine, idx, pending, out);
      break;
    case 'performance':
      scorePerformance(engine, idx, pending, out);
      break;
    case 'effectChoice':
      scoreEffect(engine, idx, pending, out);
      break;
    case 'endOfTurnOshiSkill': {
      // ターン終了時の起動型推しスキル（hBP08-007 等）。カード定義 ai.value があれば従い、
      // 無ければ控えめな既定値で「使う」（負を返す ai.value で見送りも表現できる）。
      const od = engine.registry.get(p.oshi?.number)?.onEndOfTurnOshiSkill;
      const yes = od?.ai?.value ? od.ai.value({ engine, idx, player: p }) : 8;
      for (const o of pending.options) out[o.id] = o.value ? yes : 0;
      break;
    }
    default:
      for (const o of pending.options) out[o.id] = 0;
  }
  return out;
}

/** エールの送り先スコア（アーツ解放・前進・過剰投資・リーサル到達） */
function scoreCheerTargets(engine, idx, pending, out) {
  const p = engine.state.players[idx];
  const opp = engine.state.players[1 - idx];
  const cheer = pending.cheer;
  const oppCenter = opp.center;
  const oppCenterRemain = oppCenter ? Math.max(0, engine.effectiveHp(oppCenter) - oppCenter.damage) : 0;
  const oppColor = oppCenter ? oppCenter.stack[0].color : null;
  // 自センターが次の相手ターンに倒され得るか（蓄積の正味価値判定用）。倒される体に大技用エールを貯めても
  // ダウンで全て失う＝大損。脅威下では「貯め投資」を抑え、即火力/別の体へ回す（死ぬ体に注がない）。
  const myCenter = p.center;
  const myCenterRemain = myCenter ? Math.max(0, engine.effectiveHp(myCenter) - myCenter.damage) : 0;
  const oppThreatToMyCenter = myCenter
    ? incomingDamageToCenter(engine, opp, 1 - idx, myCenter,
      { extraCheers: opponentExtraCheerProjection(engine, 1 - idx), includeBackAttackers: true })
    : 0;
  const myCenterDoomed = !!myCenter && oppThreatToMyCenter > 0 && oppThreatToMyCenter >= myCenterRemain;
  const artDmgVs = (h, a) => {
    let v = (a.dmg || 0) + Math.max(0, engine.effects.artsBonus(h, idx));
    for (const tk of a.tokkou || []) if (oppColor === tk.color) v += tk.value;
    return v;
  };
  // 指定エール構成で「今払えるアーツ」の最大実効火力（dmgBonus=枚数依存等を含む。カード番号は見ない）。
  // h.cheers を一時的に差し替えて engine._artEffectiveDamage で評価し、必ず元に戻す。
  const bestEffDmg = (h, cheers) => {
    const saved = h.cheers; h.cheers = cheers; let d = 0;
    try {
      for (const a of (h.stack[0].arts || [])) {
        if (engine._canPayCheers(cheers, a.cost)) d = Math.max(d, engine._artEffectiveDamage(h, a, idx));
      }
    } finally { h.cheers = saved; }
    return d;
  };
  // 最善の色であと extra 枚足せば撃てるアーツも含めた最大火力（今ターン到達可能火力。budgetリーサル用の概算）
  const bestReachableDmg = (h, cheers, extra) => {
    let d = 0;
    for (const a of (h.stack[0].arts || [])) {
      if (engine._canPayCheers(cheers, a.cost) || unmetCost(cheers, a.cost) <= extra) d = Math.max(d, artDmgVs(h, a));
    }
    return d;
  };
  // 今ターン効果で足せるエール枚数（自分の手札・盤面のみ。リーサル準備の見積りに使う）
  const budget = cheerBudgetThisTurn(engine, idx);
  for (const opt of pending.options) {
    const h = engine._holomemAt(p, opt.pos);
    if (!h) { out[opt.id] = -Infinity; continue; }
    const arts = h.stack[0].arts || [];
    const isActive = opt.pos.zone === 'center' || opt.pos.zone === 'collab'; // 攻撃できる前衛か
    let score = 0;
    if (arts.length > 0 && cheer) {
      const afterCheers = [...h.cheers, cheer];
      // 使い切れるエール上限(cap)＝現フォーム＋同名ブルーム後フォームのアーツの最大コスト枚数。
      // これを超えるエールは（火力が伸びる/色が前進する等のメリットが無い限り）純粋な過剰付与。
      const allArts = [...arts, ...engine._higherFormArts(h.stack[0])];
      const cap = Math.max(0, ...allArts.map((a) => (a.cost || []).length));
      let useful = false;
      // 実効火力の伸び（解放＋枚数依存スケールを一般的に捕捉。カード番号は見ない）
      const dmgNow = bestEffDmg(h, h.cheers);
      const dmgAfter = bestEffDmg(h, afterCheers);
      const gain = dmgAfter - dmgNow;
      // オーバーキル抑制: この前衛が「既に」相手センターを倒せるなら、さらに火力を盛ってもライフは増えない（KOは1回ぶん）。
      // 余剰火力の価値を大きく下げ、エールを2体目のアタッカーや色の前進へ回させる（手数＝継続攻撃を増やす）。
      const alreadyLethal = !!oppCenter && isActive && oppCenterRemain > 0 && dmgNow >= oppCenterRemain;
      if (gain > 0) {
        // このエールで火力が増える（解放 or 枚数依存で上昇）＝価値。前衛は厚く、バックは攻撃不可なので薄く。
        useful = true;
        if (alreadyLethal) score += isActive ? 4 : 2; // 既に倒せる＝オーバーキル。追いエールはほぼ無価値
        else score += isActive ? Math.min(70, 18 + gain * 0.35) : Math.min(20, 6 + gain * 0.08);
      } else {
        // 火力は増えないが、未解放アーツへ色が前進したか（将来の解放準備）。
        // 現フォームだけでなく「同名の上位フォーム（Bloom後）のアーツ」への前進も数える＝
        // 主役2ndの大技に向けて土台Debut/1stの段階から正しい色を貯められる（ゲームプラン層と対）。
        let advanced = false;
        for (const a of allArts) {
          if (engine._canPayCheers(h.cheers, a.cost)) continue;
          if (unmetCost(afterCheers, a.cost) < unmetCost(h.cheers, a.cost)) { advanced = true; break; }
        }
        if (advanced) { useful = true; score += isActive ? 12 : 5; }
        else if (h.cheers.length >= cap) {
          // 過剰付与の禁止: 使い切れる上限(cap)に達した体へ、火力も伸びず色も前進しないエールを足すのは無意味＝強く禁止。
          // 超過枚数が増えるほど重く罰し、別の体（空きのある前衛/バック）へ回させる。「効果としてメリットがある」場合は
          // gain>0 や advanced 側に入るのでここには来ない（＝メリットがある余剰だけが許される）。
          score -= 100 + (h.cheers.length - cap) * 20;
        }
        else score += 2 - h.cheers.length * 0.3; // 色が噛み合わず前進しない（最小限。空いてる体を優先＝散らす）
      }
      // 位置ボーナスは「有用なエール」のときだけ＝攻撃できる前衛に集中。無駄な色を位置目的で前衛に置かない。
      // センターは「毎ターン居座る唯一の持続アタッカー」＝エールを貯める先として最優先。コラボは次の自ターン開始時に
      // お休み（バックへ移動）＝積んでも1回しか使えず持続しないので、蓄積先としては低く評価する（即リーサルは別途加点）。
      if (useful) {
        // センターが脅威下（次ターン倒され得る）なら集約先としての優先度を下げる（死ぬ体に貯めない）。
        if (opt.pos.zone === 'center') score += myCenterDoomed ? 8 : 20;
        else if (opt.pos.zone === 'collab') score += 6;
      }
      // 集約ボーナス: 1ターンに殴れるのは前衛(センター+コラボ)中心なので、
      // 「弱い体を量産」より「最強の1体を伸ばす」方が正しい。このエールでチーム最強前衛の
      // 実効火力がどれだけ上がるかを重く評価する（既に強い主力＝スケールするアーツに積むほど高い）。
      // 持続性で重み付け: センター=満額（毎ターン殴れる）／コラボ=半減（次ターンお休みで1回限り）。
      if (isActive && dmgAfter > 0 && !alreadyLethal) {
        const fronts = [p.center, p.collab].filter(Boolean);
        const teamBestBefore = Math.max(0, ...fronts.map((x) => bestEffDmg(x, x.cheers)));
        const lift = Math.max(0, dmgAfter - teamBestBefore); // h にこのエールを足して最強前衛火力が増えるぶん
        const sustainW = opt.pos.zone === 'center' ? 1 : 0.5;
        if (lift > 0) score += Math.min(50, lift * 0.5) * sustainW;
      }
      // センター継続蓄積: センターの「最大火力アーツ（=貯め大技）」へエールを近づける置き方を、
      // 後で必ず使える投資として加点する。1枚/ターンしか増えない細い供給を、循環して下がる体に散らさず
      // 持続アタッカー(センター)へ貯め続けて大技を解放する方向に寄せる（FUWAMOCO等の貯め大技・継続火力に必須）。
      if (opt.pos.zone === 'center' && afterCheers.length <= cap && !alreadyLethal && !myCenterDoomed) {
        const big = allArts.reduce((m, a) => ((a.dmg || 0) > ((m && m.dmg) || 0) ? a : m), null);
        if (big && unmetCost(afterCheers, big.cost) < unmetCost(h.cheers, big.cost)) score += 12;
      }
      // ゲームプラン一致ボーナス: 主役ライン（デッキ火力解析/プロファイルで導出）のホロメンへ、
      // 主役アーツが必要とする色のエールを送る配分を優先する（序盤の方向付け。過剰付与には足さない）。
      // プロファイルが「エールを付けない」と指定する名前（コストを払えないサブライン等）は逆に避ける。
      const noCheer = gamePlanOf(engine, idx).profile?.noCheerNames?.includes(h.stack[0].name);
      if (noCheer) {
        score -= 8;
      } else if (afterCheers.length <= cap && planNeedsColor(engine, idx, h.stack[0], cheer?.color)) {
        // 成長段階でスケール: 同名ライン内では育った個体（2nd>1st>Debut）へ寄せる。
        // 使い捨てのDebut（コラボ燃料等）に同名2ndのコスト上限ぶんエールを死蔵する事故を抑える
        // （2026-07 決定検分: 使い捨てDebutジジに黄4枚が死蔵された）。序盤にDebutしか居ない間は×0.6でも十分機能する。
        const lvlW = h.stack[0].bloomLevel === '2nd' ? 1 : h.stack[0].bloomLevel === '1st' ? 0.8 : 0.6;
        score += planLineBonus(engine, idx, h.stack[0], 10, 6) * lvlW;
      }
      // リーサル到達（前衛のみ）。センター＋コラボの「合算」実効火力で判定する＝
      // 1体に盛るより両前衛に振った方が合計火力が高く倒し切れる、というケースも拾う。
      if (oppCenter && isActive) {
        const others = [p.center, p.collab].filter((x) => x && x !== h);
        const otherDmg = others.reduce((s, x) => s + bestEffDmg(x, x.cheers), 0);
        if (dmgAfter + otherDmg >= oppCenterRemain && dmgNow + otherDmg < oppCenterRemain) {
          score += 60; // このエールで（合算）リーサル到達
        } else if (budget > 0) {
          const otherReach = others.reduce((s, x) => s + bestReachableDmg(x, x.cheers, budget), 0);
          const reachAfter = bestReachableDmg(h, afterCheers, budget) + otherReach;
          const reachBefore = bestReachableDmg(h, h.cheers, budget) + otherReach;
          if (reachAfter >= oppCenterRemain && reachBefore < oppCenterRemain) score += 25;
        }
      }
    }
    out[opt.id] = score;
  }
}

/** メインステップの各行動スコア（パス=0 が基準。正のものだけ実行価値あり） */
function scoreMainActions(engine, idx, pending, out) {
  const p = engine.state.players[idx];
  const opp = engine.state.players[1 - idx];
  const oppIdx = 1 - idx;
  const myCenter = p.center;
  const myCenterRemain = myCenter ? engine.effectiveHp(myCenter) - myCenter.damage : 0;
  // 相手の脅威は「次ターンに（基本＋見えている効果で）エールを付け、バックからもう1体コラボ」する前提（防御不足を防ぐ）
  const oppThreat = incomingDamageToCenter(engine, opp, oppIdx, myCenter,
    { extraCheers: opponentExtraCheerProjection(engine, oppIdx), includeBackAttackers: true });
  const underLethal = !!myCenter && oppThreat > 0 && oppThreat >= myCenterRemain;

  for (const opt of pending.options) {
    let score = 0;
    switch (opt.kind) {
      case 'pass':
        score = 0;
        break;
      case 'bloom': {
        const newCard = p.hand[opt.handIndex];
        const h = engine._holomemAt(p, opt.pos);
        if (!newCard || !h) break;
        const top = h.stack[0];
        const hpGain = (newCard.hp || 0) - (top.hp || 0);
        const bdef = engine.registry.get(newCard.number);
        // ブルームエフェクトの価値: カード定義 ai.bloomValue 優先、無ければ「効果あり=+40」
        const effVal = bdef?.ai?.bloomValue
          ? bdef.ai.bloomValue({ engine, player: p, card: newCard, holomem: h })
          : (bdef?.bloomEffect ? 40 : 0);
        // 火力の伸びは「今のエールで実際に出せる火力(即)」を重く、「火力上限(将来)」を軽く評価する。
        // → 燃料の無い大型2ndへの過大評価（ブルームしても撃てない）を防ぎつつ、育成の布石も少し評価。
        const bestEff = (card, arts) => {
          const saved = h.stack[0]; h.stack[0] = card; let d = 0;
          try { for (const a of (arts || [])) if (engine._canPayCheers(h.cheers, a.cost)) d = Math.max(d, engine._artEffectiveDamage(h, a, idx)); }
          finally { h.stack[0] = saved; }
          return d;
        };
        const immediateGain = Math.max(0, bestEff(newCard, newCard.arts) - bestEff(top, top.arts));
        const futureGain = Math.max(0, maxArtDmg(newCard) - maxArtDmg(top));
        // 「今ターン攻撃に使える前衛(センター/コラボ・お休みでない)」へのブルームだけ、火力の伸びを満額評価する。
        // 撃てないバック/お休みのホロメンをブルームしても、その火力は今は使えない＝即時火力をほぼ計上しない
        // （撃てない体をHPを下げてまで2ndにする“無駄ブルーム”を抑制。前衛強化＝攻撃に直結するブルームは満額）。
        const canAttackNow = (h === myCenter || h === p.collab) && !h.rested;
        const immW = canAttackNow ? 1 : 0.1;     // 即時火力の伸び: 後衛は撃てないのでほぼ計上しない
        const futW = canAttackNow ? 0.15 : 0.05; // 火力上限(将来)の伸び: 後衛はさらに将来ぶんへ割引
        score = hpGain * 0.4 + immediateGain * 0.4 * immW + futureGain * futW + effVal;
        // ゲームプラン一致ボーナス: 主役ラインのBloom（勝ち筋の完成）を「他の同格Bloomより」優先する。
        // あくまで正の価値があるBloom同士の順位付けであり、利益ゼロ/負のBloomを実行させる加点にはしない。
        if (score > 0) score += planLineBonus(engine, idx, newCard, 10, 6);
        if (h.damage > 0 && hpGain > 0) score += 10;
        if (underLethal && h === myCenter) {
          const newRemain = (newCard.hp || 0) - h.damage;
          if (newRemain > oppThreat) score += 80;
        }
        break;
      }
      case 'place': {
        const stageCount = engine._stageCount(p);
        score = stageCount < 3 ? 50 : stageCount < 5 ? 25 : 8;
        break;
      }
      case 'collab': {
        const h = p.back[opt.backIndex];
        if (!h) break;
        const top = h.stack[0];
        const curCollab = collabValueOf(engine, p, top, h);
        score = 22 + curCollab;
        // バックは攻撃できないので、コラボは「攻撃枠を増やす」行為。今払えるアーツの火力で重み付けし、
        // 強いアタッカー（センター/コラボ限定の大型アーツ持ち等）を優先コラボする。
        const payableArts = (top.arts || []).filter((a) => engine._canPayCheers(h.cheers, a.cost));
        if (payableArts.length) score += 15 + Math.max(...payableArts.map((a) => a.dmg || 0)) * 0.08;
        // コラボ↔Bloomの順序判断: 今ターンこのバックをBloomでき、Bloom後の形のコラボ効果の方が
        // 価値が高いなら、先にBloomしてから（より良い形で）コラボするため今のコラボは後回しにする。
        // （コラボは1回限り・Bloom効果はどちらの順でも誘発・本体は最終的に同じ形になるため、差は
        //  「どちらのコラボ効果が誘発するか」だけ）。逆（現形の方が上）ならそのままコラボを優先。
        if (p.turnCount > 1) {
          const bloomCard = p.hand.find((c) => c.kind === 'holomen' && engine._canBloom(h, c));
          if (bloomCard && collabValueOf(engine, p, bloomCard, h) > curCollab + 3) {
            score = Math.min(score, 6); // 先にBloomさせる（このコラボは後回し）
          }
        }
        // コラボの諸刃: コラボは前衛をもう1枚さらす＝相手はセンターとこのコラボの2枚を倒し得る（コラボも攻撃対象）。
        // 不利（相手が次ターンに自センターをKOし得る＝underLethal）な時、攻撃の上積みも無いのに脆い体をコラボに出すと、
        // 相手に2枚目のKO（ライフもう1枚）を献上する損になる。
        //   ・コラボした体が今ターンKO/有効打を出すなら攻撃価値で相殺→減点しない。
        //   ・有利・互角（underLethalでない）なら減点しない。
        // ＝「KOに繋がるコラボ」「攻めるべき時のコラボ」は普通に打ち、不利時に“的だけ増やす脆いコラボ”だけ抑制（消極化を避ける）。
        if (score > 0 && underLethal) {
          const collabRemain = engine.effectiveHp(h) - h.damage;
          const collabAtk = bestPayableEffDmg(engine, h, idx);
          const koSomething = opp.center && collabAtk >= (engine.effectiveHp(opp.center) - opp.center.damage);
          if (collabRemain <= oppThreat && !koSomething) score -= 35;
        }
        break;
      }
      case 'support': {
        const card = p.hand[opt.handIndex];
        if (!engine.registry.get(card.number)?.support) break; // 効果未実装は温存
        // ノーリスクのドロー/サーチは「先に打って情報を増やす」= 配置・ブルームより優先（70）。
        // 緊急の防御（リーサル回避の bloom +80 等）はそれより上なので、危機時は防御が先になる。
        score = isFreePlaySupport(engine, card) ? 70 : supportValue(engine, p, card);
        break;
      }
      case 'supportAttach': {
        const card = p.hand[opt.handIndex];
        const h = engine._holomemAt(p, opt.pos);
        if (!h) break;
        const def = engine.registry.get(card.number);
        score = 12;
        if (def?.attached?.hpPlus?.(h, engine) > 0) score += 15;
        if (def?.attached?.artsPlus?.(h, engine) > 0) score += 10;
        if (def?.attached?.specialDmgPlus) score += 12;
        if (opt.pos.zone === 'center' || opt.pos.zone === 'collab') score += 6;
        break;
      }
      case 'baton': {
        if (!p.center) break;
        const centerRemain = engine.effectiveHp(p.center) - p.center.damage;
        const back = p.back[opt.backIndex];
        if (!back) break;
        const backRemain = engine.effectiveHp(back) - back.damage;
        // バトンの「正当な理由」による便益。理由が無ければ benefit=0（＝この後コストを引いて負になる）。
        let benefit = 0;
        if (underLethal && backRemain > oppThreat && backRemain > centerRemain) benefit = 70;
        // ※壁交代（育ったセンターを下げて安い体を差し出す退避）は2026-07に実装を試みたが、
        //   A/Bで大幅悪化（2/12）し撤去。理由: underLethal は劣勢中ほぼ毎ターン成立し、退避が
        //   連鎖してバトンコストのエールを毎ターン垂れ流す（壁は次ターン倒され、また退避…の中毒）。
        //   単発の退避は正しくても「繰り返し」の損を1手のスコアでは表現できない。やるなら回数制限や
        //   先読み側での評価が必要（docs/AI_AUDIT_2026-07.md 追補4）。
        else {
          // 明確に強いアタッカーがアクティブなバックにいるなら、センターへ据えて毎ターン殴る。
          const backOff = bestPayableEffDmg(engine, back, idx);
          const centerOff = bestPayableEffDmg(engine, p.center, idx);
          // 「大技に向けてエール投資が進んでいるセンター」はバトンで捨てない。
          const centerInvesting = (p.center.cheers || []).length >= 2 && (p.center.stack[0].arts || []).some((a) => {
            const need = a.cost.length || 0; if (need === 0) return false;
            const unmet = unmetCost(p.center.cheers, a.cost);
            return unmet > 0 && (need - unmet) / need >= 0.5 && (a.dmg || 0) >= backOff;
          });
          if (!back.rested && backOff >= centerOff + 60 && !centerInvesting) benefit = 30;
        }
        // バトンは「センターのエールをコスト払い＋攻撃役の入替」。正当な理由が無ければエールを捨てるだけの損。
        // ① 捨てる有用エールのコストは常に差し引く（理由の有無に関わらず実損）。
        // ② 理由がゼロのバトン（攻撃もできない/脅威も無いのに入替＝1ターン目の無駄バトン等）は基礎ペナルティで明確に負へ。
        const cArts = p.center.stack[0].arts || [];
        const cap = Math.max(0, ...cArts.map((a) => (a.cost || []).length));
        const usefulOnCenter = Math.min((p.center.cheers || []).length, cap);
        const batonCostLen = (p.center.stack[0].batonTouch || []).length;
        const cheerCost = Math.min(batonCostLen, usefulOnCenter) * 10;
        score = benefit - cheerCost - (benefit > 0 ? 0 : 10);
        break;
      }
      case 'oshiSkill': {
        const skill = p.oshi.oshiSkills?.[opt.skillIndex];
        const odef = engine.registry.get(p.oshi.number);
        const skillDef = skill?.sp ? odef?.spOshiSkill : odef?.oshiSkill;
        if (skillDef?.aiSkip && skillDef.aiSkip(engine, idx)) break;
        // カード定義 ai.value 優先（状況に応じた価値）。無ければ既定:
        //   通常推しスキル(ターンに1回・再利用可)=18 / SP推しスキル(ゲームに1回・温存したい)=12。
        if (skillDef?.ai?.value) score = skillDef.ai.value({ engine, idx, player: p });
        else score = skill?.sp ? 12 : 18;
        break;
      }
      default:
        break;
    }
    out[opt.id] = score;
  }
}

/** このホロメンを倒した時に相手が失うライフ枚数（Buzz=2 / 特殊指定 / 軽減 / ノーライフ を反映） */
function expectedLifeLoss(engine, h) {
  if (h.noLifeOnDown) return 0;
  const card = h.stack[0];
  const base = card.extraLifeLossOnDown ?? (card.buzz ? 2 : 1);
  return Math.max(0, base - (h.lifeReductionOnDown || 0));
}

/** このホロメンのダウンで相手が得をする誘発(onDown)を持つか（同点時に倒す価値をやや下げる） */
function oppGainsOnDown(engine, h) {
  if (engine.registry.get(h.stack[0].number)?.triggers?.onDown) return true;
  return (h.attachments || []).some((a) => engine.registry.get(a.number)?.triggers?.onDown);
}

/**
 * パフォーマンス（アタック）のスコア。倒せる相手を最優先しつつ、倒す価値を実態に寄せる:
 *   ライフ圧（Buzz=2等のライフ損失量）・脅威除去・相手の残ライフ・センター除去のテンポ。
 *   ダウンで相手が得をする(onDown)相手は同点時に控えめ。倒せない時は脅威の高い相手を優先的に削る。
 */
function scorePerformance(engine, idx, pending, out) {
  const p = engine.state.players[idx];
  const opp = engine.state.players[1 - idx];
  for (const opt of pending.options) {
    if (opt.kind !== 'art') { out[opt.id] = 0; continue; } // pass / declineReArts 等は 0
    const h = p[opt.zone];
    // 対象は zone+index で解決する（back は配列なので opp['back'] では取れない）
    const target = engine._targetHolomem(opp, opt.target);
    if (!h || !target) { out[opt.id] = -Infinity; continue; }
    // 借用アーツ（hBP07-048）は artObj を使う。通常は自分のアーツ配列から引く。
    const art = opt.artObj || h.stack[0].arts?.[opt.artIndex];
    if (!art) { out[opt.id] = -Infinity; continue; }
    const targetTop = target.stack[0];
    // 素の火力だけでなく、効果による加算(dmgBonus／枚数・色数スケール)・装着/継続修正・特攻(対象の色)を含む実効ダメージで判定する。
    const dmg = engine._artEffectiveDamage(h, art, idx, targetTop.color);
    const remain = engine.effectiveHp(target) - target.damage;
    // 脅威の即時性: コラボは次の相手ターンにお休み（バックへ移動）＝次ターンは攻撃できない＝即時脅威が低い。
    // センターは毎ターン攻撃してくる持続的脅威。よって「倒せるなら脅威度の高いセンター」を優先して除去する。
    const restsNextTurn = opt.target.zone === 'collab';
    const threat = maxArtDmg(targetTop) * (restsNextTurn ? 0.5 : 1); // 倒せば消せる相手の脅威（即時性で割引）
    let score = dmg * 0.2;
    if (dmg >= remain) {
      // 倒せる: ライフ圧（Buzz=2等）・脅威除去・相手の残ライフ・センター除去を反映
      const lifeLoss = expectedLifeLoss(engine, target);
      score += 70 + lifeLoss * 25;
      score += (6 - opp.life.length) * 5 * Math.max(1, lifeLoss); // 相手のライフが少ないほど致命的
      // 倒す＝その相手の火力(脅威)を永久に除去する価値。強い相手（1発で倒してくる大技持ち2nd等）ほど倒す価値が高い。
      // ＝「倒せる強いセンター2nd」を、休むだけのコラボや些末な体より優先して倒す。
      score += threat * 0.15;
      if (opt.target.zone === 'center') score += 10;              // センター除去は前衛入替を強制（テンポ）
      if (lifeLoss > 0 && oppGainsOnDown(engine, target)) score -= 12; // ダウンで相手が得をするなら控えめ
    } else {
      // 倒せない時は「脅威の高い相手（毎ターン殴ってくるセンター）」を優先的に削る（次ターンのKO＝脅威除去に繋げる）。
      score += threat * 0.08 + target.damage * 0.05;
      if (opt.target.zone === 'center') score += 5;
      // この一撃で相手が「自軍の到達火力で次に倒せる残HP」まで落ちるなら、脅威除去の布石として加点（高HPの大型脅威を崩す価値）。
      const fronts = [p.center, p.collab].filter(Boolean);
      const teamReach = Math.max(0, ...fronts.map((x) => bestPayableEffDmg(engine, x, idx)));
      if (remain - dmg <= teamReach && remain > dmg) score += threat * 0.05;
    }
    out[opt.id] = score;
  }
}

/** 効果で「得る/選ぶ」カードの価値（種類を問わず同じ物差しで比較する） */
function cardGainValue(engine, idx, card) {
  if (!card) return 0;
  const p = engine.state.players[idx];
  if (card.kind === 'holomen') {
    let v = holomenValue(card);
    const order = { Debut: 0, Spot: 0, '1st': 1, '2nd': 2 };
    const lvl = order[card.bloomLevel] ?? 0;
    const sameName = (a, b) => engine._nameIs(a, b.name) || engine._nameIs(b, a.name);
    const bodies = engine._stageCount(p);
    if (lvl === 0) {
      // Debut/Spot は手札からそのまま盤面に出せる＝土台/壁の確保。
      // 盤面が薄いほど不足＝価値↑。ほぼ埋まっていれば余剰＝価値↓（足りているDebutをわざわざ持ってこない）。
      if (bodies < 4) v += 30;
      else if (bodies >= 5) v *= 0.5;
    } else {
      // 1st/2nd は「今ブルームできる同名の土台（より低いBloomレベル）」が盤面に無ければ手札で腐る＝即戦力でない。
      const hasBase = engine._stageHolomems(p).some((h) => {
        const t = h.stack[0];
        return (order[t.bloomLevel] ?? 0) < lvl && sameName(t, card);
      });
      if (!hasBase) {
        v *= 0.3; // 土台が無く今は出せない
      } else {
        // 土台あり＝即戦力。ただし同名のブルーム札を既に手札に持っているなら冗長＝価値↓（足りているものは持ってこない）。
        const dupInHand = p.hand.some((c) => c !== card && c.kind === 'holomen'
          && (order[c.bloomLevel] ?? 0) >= 1 && sameName(c, card));
        if (dupInHand) v *= 0.6;
      }
    }
    // デッキプロファイルのキーカード（主役ラインの部材等）はサーチ/取得で優先
    if (gamePlanOf(engine, idx).profile?.keyCards?.includes(card.number)) v += 15;
    return v;
  }
  if (card.kind === 'support') {
    // デッキプロファイルのキーカードはサーチ/取得で優先（テーマの要を先に確保する）
    const prof = gamePlanOf(engine, idx).profile;
    const bonus = prof?.keyCards?.includes(card.number) ? 15 : 0;
    return supportValue(engine, p, card) + bonus;
  }
  if (card.kind === 'cheer') return 15;
  return 12;
}

/**
 * カード効果内の選択スコア。効果の「意図」(pending.request.intent) を見て、
 * 相手を狙う/自分の利益/自分を失う・得る/捨てる を区別して選ぶ。
 * intent は共通プリミティブ(ctx.chooseCard/chooseHolomem)が付与（既定: 相手=damage, 自分=benefit,
 * デッキサーチ=gain）。個別カードは intent 引数で上書きできる（例: コスト破棄=discard, 退場=sacrifice）。
 */
function scoreEffect(engine, idx, pending, out) {
  const req = pending.request || {};
  const kind = req.kind;
  // 複数選択(chooseCards): 望ましいカードをトグルで選び、枚数条件を満たしたら確定。
  // intent: gain=価値の高いものを選ぶ / discard・sacrifice・returnToDeck=価値の低い（不要な）ものを選ぶ。
  if (kind === 'chooseCards') {
    const ms = pending.multiSelect || { min: 0, max: pending.options.length, selected: [] };
    const discard = req.intent === 'discard' || req.intent === 'sacrifice' || req.intent === 'returnToDeck';
    const wantOf = (card) => {
      const v = cardGainValue(engine, idx, card);
      return discard ? -v : v; // 捨てる系は不要なカードほど選びたい
    };
    for (const opt of pending.options) {
      if (opt.confirm) { out[opt.id] = ms.selected.length >= ms.min ? 0 : -Infinity; continue; }
      if (ms.selected.includes(opt.id) || ms.selected.length >= ms.max) { out[opt.id] = -Infinity; continue; }
      out[opt.id] = wantOf(opt.card); // 正なら確定(0)より優先して選ぶ／満たしたら確定が勝つ
    }
    return;
  }
  if (kind === 'confirm') {
    // カード定義 ai.confirmValue があれば発動価値を計算（負なら見送り）。無ければ既定で発動。
    const cdef = req.sourceNumber ? engine.registry.get(req.sourceNumber) : null;
    const yesVal = cdef?.ai?.confirmValue ? cdef.ai.confirmValue({ engine, idx, request: req }) : 10;
    for (const o of pending.options) out[o.id] = o.value ? yesVal : 0;
    return;
  }
  if (kind === 'chooseHolomem') {
    const intent = req.intent;
    for (const opt of pending.options) {
      if (!opt.value) { out[opt.id] = 0; continue; } // 「選ばない」
      const { holomem, pos } = opt.value;
      const remain = engine.effectiveHp(holomem) - holomem.damage;
      const val = holomenValue(holomem.stack[0]);
      let score;
      if (opt.side === 'opp' || intent === 'damage') {
        // 相手を狙う。今ターン倒せる相手なら「脅威(火力)が最大の個体」を最優先で除去する＝再建しにくい主力2nd等を
        // 恒久的に奪う（置物を倒すより遥かに有利。じゃあ敵だねで主力2ndを引きずり出して倒す等）。
        // 倒せないなら従来どおり「最も削りやすい個体（残HP小）」。my火力＝この対象を狙える前衛(センター+コラボ)の今払える実効火力合計。
        const me = engine.state.players[idx];
        const myReach = [me.center, me.collab].filter(Boolean)
          .reduce((s, h) => s + bestPayableEffDmg(engine, h, idx), 0);
        if (remain > 0 && myReach >= remain) score = 200 + maxArtDmg(holomem.stack[0]) * 0.2; // 倒せる→脅威が大きいほど除去価値↑
        else score = 120 - remain * 0.4; // 倒せない→削りやすい個体
        if (pos.zone === 'center') score += 10;
      } else if (intent === 'sacrifice' || intent === 'returnToDeck') {
        // 自分を失う系＝価値が低く負傷した個体を差し出し、主力を残す
        score = 80 - val * 0.12 + holomem.damage * 0.2;
        if (pos.zone === 'back') score += 6;
      } else {
        // 自分への利益（回復/強化/エール送り等）＝主力（前衛・高価値・負傷）を選ぶ
        score = 10 + val * 0.05 + holomem.damage * 0.1;
        if (pos.zone === 'center') score += 25;
        else if (pos.zone === 'collab') score += 18;
        if ((holomem.stack[0].arts || []).some((a) => engine._canPayCheers(holomem.cheers, a.cost))) score += 8;
      }
      out[opt.id] = score;
    }
    return;
  }
  if (kind === 'chooseCard') {
    const intent = req.intent; // 'gain' | 'discard' | undefined
    for (const opt of pending.options) {
      if (!opt.card) { out[opt.id] = -1; continue; } // skip はカードが無い時のみ
      const v = cardGainValue(engine, idx, opt.card);
      out[opt.id] = intent === 'discard' ? -v : v; // 破棄系は不要なカードを選ぶ
    }
    return;
  }
  if (kind === 'chooseOption') {
    // 汎用の順序/択一選択（同時ダウンの処理順・付け上限超過のkeep・同時誘発の解決順 等）。
    // 選択肢がカード参照(opt.card)を持つ場合は価値の高いカードを残す/選ぶ。順序系は0のまま（先頭=従来挙動）。
    for (const opt of pending.options) out[opt.id] = opt.card ? cardGainValue(engine, idx, opt.card) : 0;
    return;
  }
  for (const o of pending.options) out[o.id] = 0;
}

/**
 * 最善の選択肢ID。pass/done（=何もしない基準）を初期値にして、それを「上回る」行動だけ選ぶ
 * （従来の「正のスコアの行動のみ実行、無ければパス」を踏襲）。
 */
export function bestOptionId(engine, idx, pending = engine.state.pending) {
  if (!pending || !pending.options || pending.options.length === 0) return null;
  const scores = scoreOptions(engine, idx, pending);
  const opts = pending.options;
  const baseline = opts.find((o) => o.kind === 'pass' || o.id === 'done');
  let bestId = baseline ? baseline.id : opts[0].id;
  let bestScore = scores[bestId] ?? 0;
  for (const o of opts) {
    const sc = scores[o.id] ?? -Infinity;
    if (sc > bestScore) { bestScore = sc; bestId = o.id; }
  }
  return bestId;
}
