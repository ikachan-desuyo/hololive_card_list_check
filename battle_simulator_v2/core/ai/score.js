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

import { maxArtDmg, incomingDamageToCenter, unmetCost, cheerBudgetThisTurn } from './evaluate.js';

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
  const bestPayableDmg = (h, cheers) => {
    let d = 0;
    for (const a of (h.stack[0].arts || [])) if (engine._canPayCheers(cheers, a.cost)) d = Math.max(d, artDmgVs(h, a));
    return d;
  };
  // 最善の色であと extra 枚足せば撃てるアーツも含めた最大火力（今ターン到達可能火力）
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
    let score = 0;
    if (opt.pos.zone === 'center') score += 12;
    else if (opt.pos.zone === 'collab') score += 8;
    if (arts.length > 0 && cheer) {
      const payableBefore = arts.filter((a) => engine._canPayCheers(h.cheers, a.cost));
      const afterCheers = [...h.cheers, cheer];
      const payableAfter = arts.filter((a) => engine._canPayCheers(afterCheers, a.cost));
      const maxCost = Math.max(...arts.map((a) => a.cost.length));
      if (payableAfter.length > payableBefore.length) {
        // このエールでアーツが解放される（色も満たす）→ 解放アーツの火力で加点
        const unlocked = payableAfter.filter((a) => !payableBefore.includes(a));
        score += 40 + Math.max(...unlocked.map((a) => a.dmg)) * 0.2;
      } else {
        // まだ解放されないアーツへ「色を満たす方向に前進」したか（色一致・火力で重み付け）。
        // この1枚で未充足要求が減るアーツのうち、最も火力が高いものを評価する。
        let bestProgress = 0;
        for (const a of arts) {
          if (payableBefore.includes(a)) continue; // 既に撃てるアーツは前進対象外
          if (unmetCost(afterCheers, a.cost) < unmetCost(h.cheers, a.cost)) {
            bestProgress = Math.max(bestProgress, 12 + (a.dmg || 0) * 0.1);
          }
        }
        if (bestProgress > 0) score += bestProgress; // 強いアーツへ前進するほど高い
        else if (h.cheers.length >= maxCost) score -= 30; // どのアーツも進まず満杯＝過剰投資
        else score += 2; // 色が噛み合わず前進しない（最小限）
      }
      if (oppCenter && (opt.pos.zone === 'center' || opt.pos.zone === 'collab')) {
        const before = bestPayableDmg(h, h.cheers);
        const after = bestPayableDmg(h, afterCheers);
        if (after >= oppCenterRemain && before < oppCenterRemain) {
          score += 60; // このエールだけで即リーサル到達
        } else if (budget > 0) {
          // このエール＋今ターンの追加エール(budget)で、相手センターを倒せる火力に届くなら
          // 「今ターン中にリーサルを組める」前進として加点（即リーサルより控えめ）
          const reachAfter = bestReachableDmg(h, afterCheers, budget);
          const reachBefore = bestReachableDmg(h, h.cheers, budget);
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
  // 相手の脅威は次ターンの基本エール1枚で解放されるアーツも見込む（過小評価による防御不足を防ぐ）
  const oppThreat = incomingDamageToCenter(engine, opp, oppIdx, myCenter, { extraCheers: 1 });
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
        const dmgGain = maxArtDmg(newCard) - maxArtDmg(top);
        const bdef = engine.registry.get(newCard.number);
        // ブルームエフェクトの価値: カード定義 ai.bloomValue 優先、無ければ「効果あり=+40」
        const effVal = bdef?.ai?.bloomValue
          ? bdef.ai.bloomValue({ engine, player: p, card: newCard, holomem: h })
          : (bdef?.bloomEffect ? 40 : 0);
        score = hpGain * 0.4 + dmgGain * 0.5 + effVal;
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
        else if (centerRemain <= 40 && backRemain > centerRemain + 30) score = 35;
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
    const threat = maxArtDmg(targetTop); // 倒せば消せる相手の脅威
    let score = dmg * 0.2;
    if (dmg >= remain) {
      // 倒せる: ライフ圧（Buzz=2等）・脅威除去・相手の残ライフ・センター除去を反映
      const lifeLoss = expectedLifeLoss(engine, target);
      score += 70 + lifeLoss * 25;
      score += (6 - opp.life.length) * 5 * Math.max(1, lifeLoss); // 相手のライフが少ないほど致命的
      score += threat * 0.05;                                     // 強い相手ほど倒す価値が高い
      if (opt.target.zone === 'center') score += 10;              // センター除去は前衛入替を強制（テンポ）
      if (lifeLoss > 0 && oppGainsOnDown(engine, target)) score -= 12; // ダウンで相手が得をするなら控えめ
    } else {
      // 倒せない: チップダメージ＋脅威の高い相手を削る方をやや優先
      score += threat * 0.03;
      if (opt.target.zone === 'center') score += 5;
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
    // 盤面が薄いときは、すぐ置けるDebutの価値を上げる（展開を優先）
    if (engine._stageCount(p) < 4 && card.bloomLevel === 'Debut') v += 30;
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
