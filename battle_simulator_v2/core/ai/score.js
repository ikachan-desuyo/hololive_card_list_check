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

import { maxArtDmg, incomingDamageToCenter } from './evaluate.js';

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
  return score;
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
      for (const o of pending.options) out[o.id] = holomenValue(p.hand[o.handIndex]);
      break;
    case 'placementPenalty':
      for (const o of pending.options) out[o.id] = -cardKeepValue(p.hand[o.handIndex]);
      break;
    case 'placementBack':
      for (const o of pending.options) out[o.id] = o.id === 'done' ? 0 : holomenValue(p.hand[o.handIndex]);
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
  const bestPayableDmg = (h, cheers) => {
    let d = 0;
    for (const a of (h.stack[0].arts || [])) {
      if (!engine._canPayCheers(cheers, a.cost)) continue;
      let v = (a.dmg || 0) + Math.max(0, engine.effects.artsBonus(h, idx));
      for (const tk of a.tokkou || []) if (oppColor === tk.color) v += tk.value;
      d = Math.max(d, v);
    }
    return d;
  };
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
        const unlocked = payableAfter.filter((a) => !payableBefore.includes(a));
        score += 40 + Math.max(...unlocked.map((a) => a.dmg)) * 0.2;
      } else if (h.cheers.length < maxCost) {
        score += 18;
      } else {
        score -= 30;
      }
      if (oppCenter && (opt.pos.zone === 'center' || opt.pos.zone === 'collab')) {
        const before = bestPayableDmg(h, h.cheers);
        const after = bestPayableDmg(h, afterCheers);
        if (after >= oppCenterRemain && before < oppCenterRemain) score += 60;
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
  const oppThreat = incomingDamageToCenter(engine, opp, oppIdx, myCenter);
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
        score = hpGain * 0.4 + dmgGain * 0.5;
        if (engine.registry.get(newCard.number)?.bloomEffect) score += 40;
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
        score = 22;
        const top = h.stack[0];
        if (engine.registry.get(top.number)?.collabEffect) score += 18;
        if ((top.arts || []).some((a) => engine._canPayCheers(h.cheers, a.cost))) score += 15;
        break;
      }
      case 'support': {
        const card = p.hand[opt.handIndex];
        if (!engine.registry.get(card.number)?.support) break; // 効果未実装は温存
        score = supportValue(engine, p, card);
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
        score = 18;
        break;
      }
      default:
        break;
    }
    out[opt.id] = score;
  }
}

/** パフォーマンス（アタック）のスコア: 倒せる相手を最優先、次に火力 */
function scorePerformance(engine, idx, pending, out) {
  const p = engine.state.players[idx];
  const opp = engine.state.players[1 - idx];
  for (const opt of pending.options) {
    if (opt.kind !== 'art') { out[opt.id] = 0; continue; } // pass 等は 0
    const h = p[opt.zone];
    const target = opp[opt.target.zone];
    if (!h || !target) { out[opt.id] = -Infinity; continue; }
    const art = h.stack[0].arts[opt.artIndex];
    let dmg = art.dmg;
    const targetTop = target.stack[0];
    for (const tk of art.tokkou || []) if (targetTop.color === tk.color) dmg += tk.value;
    dmg += engine.effects.artsBonus(h, idx);
    const remain = engine.effectiveHp(target) - target.damage;
    let score = dmg * 0.2;
    if (dmg >= remain) {
      score += 100;
      if (opt.target.zone === 'center') score += 10;
      score += (6 - opp.life.length) * 5;
    } else if (opt.target.zone === 'center') {
      score += 5;
    }
    out[opt.id] = score;
  }
}

/** カード効果内の選択スコア */
function scoreEffect(engine, idx, pending, out) {
  const kind = pending.request?.kind;
  if (kind === 'confirm') {
    for (const o of pending.options) out[o.id] = o.value ? 10 : 0; // 任意効果は基本発動
    return;
  }
  if (kind === 'chooseHolomem') {
    for (const opt of pending.options) {
      if (!opt.value) { out[opt.id] = 0; continue; } // 「選ばない」
      const { holomem, pos } = opt.value;
      let score = 0;
      if (opt.side === 'opp') {
        const remain = engine.effectiveHp(holomem) - holomem.damage;
        score = 100 - remain * 0.3;
        if (pos.zone === 'center') score += 8;
      } else {
        if (pos.zone === 'center') score += 25;
        else if (pos.zone === 'collab') score += 18;
        score += holomem.damage * 0.1;
      }
      out[opt.id] = score;
    }
    return;
  }
  if (kind === 'chooseCard') {
    for (const opt of pending.options) {
      if (!opt.card) { out[opt.id] = -1; continue; } // skip はカードが無い時のみ
      out[opt.id] = opt.card.kind === 'holomen' ? holomenValue(opt.card) : 20;
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
