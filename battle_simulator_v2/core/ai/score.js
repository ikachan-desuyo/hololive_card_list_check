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

/** 手札に残す価値（ペナルティで戻す時は低い順に捨てる） */
function cardKeepValue(card) {
  if (card.kind === 'holomen') return card.bloomLevel === 'Debut' ? 50 : 35;
  if (card.kind === 'support') return 25;
  return 10;
}

/** サポートカードの価値（カード定義 ai.supportValue 優先、無ければテキスト汎用評価） */
function supportValue(engine, p, card) {
  const def = engine.registry.get(card.number);
  if (def?.ai?.supportValue) return def.ai.supportValue({ engine, player: p, card });
  const text = card.supportText || '';
  let score = 12;
  if (/[\d１２３４５６７８９]枚引/.test(text)) score = 24 + Math.max(0, 6 - p.hand.length) * 3;
  if (/デッキから/.test(text) && /(手札に加える|公開し)/.test(text)) score = Math.max(score, 26);
  if (/ステージに出す/.test(text)) score = Math.max(score, engine._stageCount(p) < 4 ? 30 : 8);
  if (/交代/.test(text)) score = Math.max(score, 16);
  const sd = text.match(/特殊ダメージ(\d+)/); // 特殊ダメージ系は火力ぶん価値を上げる
  if (sd) score = Math.max(score, 18 + Number(sd[1]) * 0.4);
  if (/回復/.test(text)) score = Math.max(score, 14);
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
        out[o.id] = v;
      }
      break;
    case 'placementPenalty':
      for (const o of pending.options) out[o.id] = -cardKeepValue(p.hand[o.handIndex]);
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
        out[o.id] = h ? holomenValue(h.stack[0]) + engine.effectiveHp(h) - h.damage : -Infinity;
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
      const maxCost = Math.max(...arts.map((a) => a.cost.length));
      let useful = false;
      // 実効火力の伸び（解放＋枚数依存スケールを一般的に捕捉。カード番号は見ない）
      const dmgNow = bestEffDmg(h, h.cheers);
      const dmgAfter = bestEffDmg(h, afterCheers);
      const gain = dmgAfter - dmgNow;
      if (gain > 0) {
        // このエールで火力が増える（解放 or 枚数依存で上昇）＝価値。前衛は厚く、バックは攻撃不可なので薄く。
        useful = true;
        score += isActive ? Math.min(70, 18 + gain * 0.35) : Math.min(20, 6 + gain * 0.08);
      } else {
        // 火力は増えないが、未解放アーツへ色が前進したか（将来の解放準備）
        let advanced = false;
        for (const a of arts) {
          if (engine._canPayCheers(h.cheers, a.cost)) continue;
          if (unmetCost(afterCheers, a.cost) < unmetCost(h.cheers, a.cost)) { advanced = true; break; }
        }
        if (advanced) { useful = true; score += isActive ? 12 : 5; }
        else if (h.cheers.length >= maxCost) score -= 30; // どのアーツも伸びず満杯＝過剰投資
        else score += 2; // 色が噛み合わず前進しない（最小限）
      }
      // 位置ボーナスは「有用なエール」のときだけ＝攻撃できる前衛に集中。無駄な色を位置目的で前衛に置かない。
      if (useful) {
        if (opt.pos.zone === 'center') score += 12;
        else if (opt.pos.zone === 'collab') score += 8;
      }
      // 集約ボーナス: 1ターンに殴れるのは前衛(センター+コラボ)中心なので、
      // 「弱い体を量産」より「最強の1体を伸ばす」方が正しい。このエールでチーム最強前衛の
      // 実効火力がどれだけ上がるかを重く評価する（既に強い主力＝スケールするアーツに積むほど高い）。
      if (isActive && dmgAfter > 0) {
        const fronts = [p.center, p.collab].filter(Boolean);
        const teamBestBefore = Math.max(0, ...fronts.map((x) => bestEffDmg(x, x.cheers)));
        const lift = Math.max(0, dmgAfter - teamBestBefore); // h にこのエールを足して最強前衛火力が増えるぶん
        if (lift > 0) score += Math.min(50, lift * 0.5);
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
        score = hpGain * 0.4 + immediateGain * 0.4 + futureGain * 0.15 + effVal;
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
        if (underLethal && backRemain > oppThreat && backRemain > centerRemain) score = 70;
        // 育てた（エールを積んだ）センターは下げない＝攻撃機会とエール投資を捨てない。
        // 安易な入替は「センターが瀕死かつ実質エール無し」のときだけ。
        // ただし「HPが低いだけ」では退かない: 残せば有効な攻撃（特に相手をKO）できる前衛は、退避でエールを捨てて
        // 攻撃機会を失う方が損なので退かない（＝HP低下のみを理由にしたバトンは論理的でない）。
        else if (centerRemain <= 40 && backRemain > centerRemain + 30 && (p.center.cheers || []).length <= 1) {
          const centerOff = bestPayableEffDmg(engine, p.center, idx);
          const canKO = opp.center && centerOff >= (engine.effectiveHp(opp.center) - opp.center.damage);
          if (centerOff < 30 && !canKO) score = 35; // 攻撃価値の無い置物のときだけ退避
        }
        else {
          // 明確に強いアタッカーがアクティブなバックにいるなら、センターへ据えて毎ターン殴る
          // （コラボは毎リセットで休むため、大技要員はセンターで継続攻撃させたい）。
          const backOff = bestPayableEffDmg(engine, back, idx);
          const centerOff = bestPayableEffDmg(engine, p.center, idx);
          // ただし「大技に向けてエール投資が進んでいるセンター」はバトンで捨てない（バトンコストでエールを失う＝無駄打ちの原因）。
          const centerInvesting = (p.center.cheers || []).length >= 2 && (p.center.stack[0].arts || []).some((a) => {
            const need = a.cost.length || 0; if (need === 0) return false;
            const unmet = unmetCost(p.center.cheers, a.cost);
            return unmet > 0 && (need - unmet) / need >= 0.5 && (a.dmg || 0) >= backOff; // 半分以上投資済みで、バック火力以上の大技
          });
          if (!back.rested && backOff >= centerOff + 60 && !centerInvesting) score = 30;
        }
        // バトンコストで捨てる「有用エール」のぶんを損として差し引く（貯めたエールの無駄捨てを論理的に抑制）。
        if (score > 0) {
          const cArts = p.center.stack[0].arts || [];
          const cap = Math.max(0, ...cArts.map((a) => (a.cost || []).length));
          const usefulOnCenter = Math.min((p.center.cheers || []).length, cap);
          const batonCostLen = (p.center.stack[0].batonTouch || []).length;
          score -= Math.min(batonCostLen, usefulOnCenter) * 8;
        }
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
    let dmg = art.dmg;
    const targetTop = target.stack[0];
    for (const tk of art.tokkou || []) if (targetTop.color === tk.color) dmg += tk.value;
    dmg += engine.effects.artsBonus(h, idx);
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
    return v;
  }
  if (card.kind === 'support') return supportValue(engine, p, card);
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
        // 相手を狙う＝倒しやすい個体（残HP小）・センター優先
        score = 120 - remain * 0.4;
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
