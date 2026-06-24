/**
 * AI 共通評価関数（Phase 1: 評価関数の整備）
 *
 * 盤面を「あるプレイヤー idx から見た優劣」のスカラーに変換する。各決定ポイントの
 * ヒューリスティックは、ここで定義する部品（盤面火力・生存力・リーサル脅威 等）を
 * 共通の物差しとして使う（個別の決定ロジックは別ファイルで段階的にこの評価へ寄せる）。
 *
 * 公平性の原則（heuristic.js と共通）: 公開情報のみを使う。
 *   使ってよい: 自分の手札・両者のステージ/アーカイブ/ライフ枚数/山札枚数/ホロパワー枚数・
 *              相手の手札「枚数」・盤上ホロメンのHP/ダメージ/エール/アーツ（公開情報）
 *   使ってはいけない: 相手の手札の中身・山札やエールデッキの中身と順序
 *
 * すべての重みは WEIGHTS にまとめ、調整しやすくしている。値は「ライフ1枚 ≒ 120点」を
 * 基準に、盤面火力・生存力などを相対化している。
 */

import { COLORLESS } from '../constants.js';

export const WEIGHTS = {
  life: 120, // ライフ1枚差の価値（勝利条件に直結するため最も重い）
  hpRemain: 0.30, // 盤上ホロメンの残りHP1につき（生存力）
  threat: 0.35, // 盤上ホロメンの最大アーツ火力1につき（盤面の脅威）
  ready: 10, // いま支払えるアーツを持つ（即アタッカーになれる）ホロメン1体につき
  centerActive: 8, // アクティブなセンターがいる
  collabActive: 6, // アクティブなコラボがいる
  handCard: 4, // 手札1枚（リソース。中身は見ない＝枚数のみ）
  holoPower: 2, // ホロパワー1枚（推しスキルの燃料）
  archiveCheer: 1, // アーカイブのエール1枚（回収・再利用の見込み）
  lethalThreatToMe: -70, // 次の相手ターンに自センターが倒され得る
  lethalChanceToOpp: 55, // 自分が相手センターを倒し得る
  noBoard: -2000, // ステージにホロメンが居ない（実質敗北）
  noCenter: -40, // センターが空（バックから補充が要る／攻撃を受けやすい）
};

/** カード（ホロメンカード）の最大アーツ火力（素点。特攻・修正は含まない目安） */
export function maxArtDmg(card) {
  return Math.max(0, ...((card?.arts || []).map((a) => a.dmg || 0)));
}

/** いま（現在のエールで）支払えるアーツがあるか */
export function canActNow(engine, h) {
  const arts = h.stack[0].arts || [];
  return arts.some((a) => engine._canPayCheers(h.cheers, a.cost));
}

/**
 * 盤上ホロメン1体の価値（idx 視点・正の値）。
 *   生存力（残りHP）＋ 脅威（今実際に撃てる火力を重視）＋ 即アタッカー度。
 * 脅威は「今のエールで撃てる実効火力」を主に評価する。エールが無くて撃てない大型ホロメンは
 * 火力上限(maxArtDmg)を満額では数えず、潜在ぶんを軽く見るだけ（＝燃料の無い2ndだらけの盤面を過大評価しない）。
 */
export function holomemBoardValue(engine, h, idx, attackSoon = true) {
  const top = h.stack[0];
  const hpRemain = Math.max(0, engine.effectiveHp(h) - h.damage);
  // 今払えるアーツの火力（payable）と、まだ払えないが「エール投資が進んでいる大技」の到達度つき価値（reaching）。
  // reaching は大技に向けて貯めたエールの価値を表す＝バトン等でこのエールを捨てると評価が下がる（無駄打ちを抑制）。
  let payableDmg = 0;
  let reaching = 0;
  for (const a of (top.arts || [])) {
    const need = a.cost.length || 0;
    const unmet = unmetCost(h.cheers, a.cost);
    if (unmet === 0) {
      payableDmg = Math.max(payableDmg, a.dmg || 0);
    } else if (need > 0) {
      // どれだけコストを満たせているか（0..1）。大技に近いほど（=投資が進むほど）価値を認める。
      reaching = Math.max(reaching, (a.dmg || 0) * ((need - unmet) / need));
    }
  }
  if (payableDmg > 0) payableDmg += Math.max(0, engine.effects.artsBonus(h, idx));
  const potential = maxArtDmg(top); // エールを足せば届く火力上限（薄い将来性）
  let threat = payableDmg + reaching * 0.4 + potential * 0.1;
  // 1ターンに殴れるのは前衛(センター+コラボ)だけ。バック/お休みのホロメンに火力を盛っても今は使えないので、
  // 攻撃価値は将来ぶんに割り引く（＝「弱い体に薄く広げる」より「前衛を強くする」方を高く評価する）。
  if (!attackSoon) threat *= 0.4;
  let v = hpRemain * WEIGHTS.hpRemain + threat * WEIGHTS.threat;
  if (payableDmg > 0 && attackSoon) v += WEIGHTS.ready; // 今すぐ攻撃に使える
  return v;
}

/** プレイヤー p（idx）の盤面総合力 */
export function boardPower(engine, p, idx) {
  const mems = engine._stageHolomems(p);
  let power = 0;
  for (const h of mems) {
    const attackSoon = (h === p.center || h === p.collab) && !h.rested; // 今ターン攻撃に使える前衛か
    power += holomemBoardValue(engine, h, idx, attackSoon);
  }
  if (p.center && !p.center.rested) power += WEIGHTS.centerActive;
  if (p.collab && !p.collab.rested) power += WEIGHTS.collabActive;
  return power;
}

/** ホロメン h の現在の残りHP */
function remainHp(engine, h) {
  return Math.max(0, engine.effectiveHp(h) - h.damage);
}

/**
 * 相手が次ターンに付けられそうな追加エール枚数の見積り（公開情報のみ）。
 * 相手の手札は見ないが、「相手の盤面に見えるエール付与効果（コラボ/ブルーム/ギフト）は使ってくる」という
 * 行動傾向で、基本エール1枚＋効果ぶんを見込む。これにより相手の脅威の過小評価をさらに減らす。
 */
export function opponentExtraCheerProjection(engine, oppIdx) {
  const opp = engine.state.players[oppIdx];
  let effGain = 0;
  for (const h of engine._stageHolomems(opp)) {
    for (const kw of (h.stack[0].keywords || [])) {
      if (/コラボ|ブルーム|ギフト/.test(kw.subtype || '')) effGain = Math.max(effGain, cheerGainFromText(kw.text));
    }
  }
  return 1 + Math.min(effGain, 3); // 基本1枚＋効果で付けられそうな枚数（上限3）
}

/** アーツ a を defColor のセンターに当てた時の火力（特攻・実効修正込み） */
function artDamageVs(engine, h, a, defColor, attackerIdx) {
  let d = (a.dmg || 0) + Math.max(0, engine.effects.artsBonus(h, attackerIdx));
  for (const tk of a.tokkou || []) if (defColor === tk.color) d += tk.value;
  return d;
}

/** コスト cost に対して cheers で満たせていない要求数（色一致を考慮）。少ないほど解放に近い。
 *  すなわち「最善の色のエールを unmetCost 枚足せば、このアーツは払える」ことを意味する。 */
export function unmetCost(cheers, cost) {
  const pool = cheers.map((c) => c.color);
  const specific = cost.filter((c) => c !== COLORLESS);
  const anyCount = cost.length - specific.length;
  let unmet = 0;
  for (const color of specific) {
    const i = pool.indexOf(color);
    if (i === -1) unmet++;
    else pool.splice(i, 1);
  }
  unmet += Math.max(0, anyCount - pool.length); // 残ったエールで無色枠を埋める
  return unmet;
}

const CHEER_BUDGET_CAP = 4; // 過大評価防止の上限

function resolveNum(v, ctx) { return typeof v === 'function' ? (Number(v(ctx)) || 0) : (Number(v) || 0); }

/** 効果テキストから「付けられるエール枚数」を控えめに見積る（エールを送る/付ける系のみ） */
export function cheerGainFromText(text) {
  if (!text || !/エール/.test(text) || !/(送る|送り|付け|アタッチ)/.test(text)) return 0;
  const m = text.match(/([0-9０-９]+)\s*枚/);
  let n = 1;
  if (m) { n = Number(m[1].replace(/[０-９]/g, (c) => String('０１２３４５６７８９'.indexOf(c)))) || 1; }
  return Math.min(n, 3);
}

/**
 * このターン、現在の手札・盤面の効果で「あと何枚エールを付けられるか」の見積り（自分視点・上限キャップ付き）。
 *   - 手札の支援カード（実装済み・エール付与テキスト or ai.cheerGain）
 *   - 盤面ホロメン／推しスキル（条件付き効果の過大評価を避け、ai.cheerGain を持つカードのみ）
 * ※相手の手札は見ない（公開情報のみ）。基本エールステップの1枚はここに含めない（別枠・既に置かれている想定）。
 */
export function cheerBudgetThisTurn(engine, idx) {
  const p = engine.state.players[idx];
  let budget = 0;
  for (const c of p.hand) {
    if (c.kind !== 'support') continue;
    const def = engine.registry.get(c.number);
    if (!def?.support) continue; // 未実装は数えない
    budget += def.ai?.cheerGain != null ? resolveNum(def.ai.cheerGain, { engine, player: p, card: c })
      : cheerGainFromText(c.supportText);
  }
  for (const h of engine._stageHolomems(p)) {
    const def = engine.registry.get(h.stack[0].number);
    if (def?.ai?.cheerGain != null) budget += resolveNum(def.ai.cheerGain, { engine, player: p, holomem: h });
  }
  const odef = engine.registry.get(p.oshi?.number);
  if (odef?.ai?.cheerGain != null && p.holoPower.length > 0) budget += resolveNum(odef.ai.cheerGain, { engine, player: p });
  return Math.min(budget, CHEER_BUDGET_CAP);
}

/**
 * attacker 側が defenderCenter に対して「（追加エールも込みで）このターンで与えうる」最大ダメージの概算。
 * 公開情報のみ: attacker 側の盤上ホロメン（センター＋コラボ最大2回ぶん）の最大火力（特攻込み）を合計。
 *
 * extraCheers: 「最善の色のエールをあと何枚足せるか」。そのぶんで解放されるアーツも到達可能として数える。
 *   - 防御（相手ターンの脅威）: 1（相手は次ターンに基本エール1枚。相手の手札効果は見ない＝公開情報のみ）。
 *   - 攻撃（自分のリーサル好機）: cheerBudgetThisTurn（自分が今ターン効果で足せる枚数）。
 * includeBackAttackers: 相手の脅威見積り用。相手は次ターンに「センター＋バックから1体コラボ」して殴ってくるため、
 *   バックのアクティブなホロメンも攻撃要員候補に含める（攻撃できるのは最大2体なので上位2体ぶんを合計）。
 */
export function incomingDamageToCenter(engine, attacker, attackerIdx, defenderCenter, { extraCheers = 0, includeBackAttackers = false } = {}) {
  if (!defenderCenter) return 0;
  const defColor = defenderCenter.stack[0].color;
  const pool = [attacker.center, attacker.collab];
  if (includeBackAttackers) pool.push(...(attacker.back || [])); // 次ターンにコラボへ上げてくる候補
  const perAttacker = [];
  for (const h of pool) {
    if (!h || h.rested) continue; // お休み中は次ターンにコラボへ出せない
    // 相手の脅威見積りでは「次ターンにブルームして上位フォームの大技を撃つ」も候補に含める（公開のカードプールから）
    const arts = [...(h.stack[0].arts || [])];
    if (includeBackAttackers) arts.push(...engine._higherFormArts(h.stack[0]));
    let best = 0;
    for (const a of arts) {
      // 今払える、または最善の色で extraCheers 枚足せば払える（=今/今ターン到達可能。エールはブルームしても引き継ぐ）
      if (engine._canPayCheers(h.cheers, a.cost) || unmetCost(h.cheers, a.cost) <= extraCheers) {
        best = Math.max(best, artDamageVs(engine, h, a, defColor, attackerIdx));
      }
    }
    if (best > 0) perAttacker.push(best);
  }
  // 1ターンに攻撃できるのは最大2体（センター＋コラボ）なので、火力上位2体ぶんを脅威とみなす
  perAttacker.sort((x, y) => y - x);
  return perAttacker.slice(0, 2).reduce((s, d) => s + d, 0);
}

/**
 * 盤面評価（idx 視点。高いほど idx に有利）。
 * 戻り値は { total, parts } で、parts は調整・テスト用の内訳。
 */
export function evaluateState(engine, idx) {
  const s = engine.state;
  const me = s.players[idx];
  const opp = s.players[1 - idx];
  const parts = {};

  // 1) ライフ差（勝利条件）
  parts.life = (me.life.length - opp.life.length) * WEIGHTS.life;

  // 2) 盤面総合力の差
  parts.board = boardPower(engine, me, idx) - boardPower(engine, opp, 1 - idx);

  // 3) リソース（手札枚数差・ホロパワー差・アーカイブのエール）
  parts.hand = (me.hand.length - opp.hand.length) * WEIGHTS.handCard;
  parts.holoPower = (me.holoPower.length - opp.holoPower.length) * WEIGHTS.holoPower;
  parts.archiveCheer = (me.archive.filter((c) => c.kind === 'cheer').length
    - opp.archive.filter((c) => c.kind === 'cheer').length) * WEIGHTS.archiveCheer;

  // 4) 盤面崩壊リスク（ホロメン不在＝実質敗北、センター空＝被弾しやすい）
  parts.structure = 0;
  if (engine._stageHolomems(me).length === 0) parts.structure += WEIGHTS.noBoard;
  else if (!me.center) parts.structure += WEIGHTS.noCenter;
  if (engine._stageHolomems(opp).length === 0) parts.structure -= WEIGHTS.noBoard;
  else if (!opp.center) parts.structure -= WEIGHTS.noCenter;

  // 5) リーサル脅威/好機（次の1ターンの読み）
  parts.lethal = 0;
  const myCenterRemain = me.center ? remainHp(engine, me.center) : 0;
  // 相手の脅威は「次ターンに（基本＋見えている効果で）エールを付け、バックからもう1体コラボ」する前提で見積もる
  const oppToMe = incomingDamageToCenter(engine, opp, 1 - idx, me.center,
    { extraCheers: opponentExtraCheerProjection(engine, 1 - idx), includeBackAttackers: true });
  if (me.center && oppToMe >= myCenterRemain) parts.lethal += WEIGHTS.lethalThreatToMe;
  const oppCenterRemain = opp.center ? remainHp(engine, opp.center) : 0;
  // 自分のリーサル好機は「今ターン効果で足せるエール（cheer budget）で解放されるアーツ」も見込む
  const meToOpp = incomingDamageToCenter(engine, me, idx, opp.center, { extraCheers: cheerBudgetThisTurn(engine, idx) });
  if (opp.center && meToOpp >= oppCenterRemain) parts.lethal += WEIGHTS.lethalChanceToOpp;

  // 6) 継続攻撃力: 最大火力のホロメンがコラボにいると次のリセットで休む＝来ターン殴れない。
  //    大技要員はセンター（持続）に据えるべき、という方向に評価を寄せる（自分は減点・相手は加点）。
  parts.persistence = -collabRestPenalty(engine, me, idx) + collabRestPenalty(engine, opp, 1 - idx);

  const total = Object.values(parts).reduce((a, b) => a + b, 0);
  return { total, parts };
}

/** 最大火力(実効)のホロメンがコラボにいる場合のペナルティ量（来ターンに休んで使えないぶん） */
function collabRestPenalty(engine, p, idx) {
  const eff = (h) => {
    if (!h) return 0;
    let d = 0;
    for (const a of (h.stack[0].arts || [])) {
      if (engine._canPayCheers(h.cheers, a.cost)) d = Math.max(d, engine._artEffectiveDamage(h, a, idx));
    }
    return d;
  };
  const kf = eff(p.collab);
  return kf > eff(p.center) ? kf * 0.15 : 0;
}
