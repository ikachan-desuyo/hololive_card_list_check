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
 *   生存力（残りHP）＋ 脅威（最大火力＋実効アーツ修正）＋ 即アタッカー度。
 */
export function holomemBoardValue(engine, h, idx) {
  const top = h.stack[0];
  const hpRemain = Math.max(0, engine.effectiveHp(h) - h.damage);
  const threat = maxArtDmg(top) + Math.max(0, engine.effects.artsBonus(h, idx));
  let v = hpRemain * WEIGHTS.hpRemain + threat * WEIGHTS.threat;
  if (canActNow(engine, h)) v += WEIGHTS.ready;
  return v;
}

/** プレイヤー p（idx）の盤面総合力 */
export function boardPower(engine, p, idx) {
  const mems = engine._stageHolomems(p);
  let power = 0;
  for (const h of mems) power += holomemBoardValue(engine, h, idx);
  if (p.center && !p.center.rested) power += WEIGHTS.centerActive;
  if (p.collab && !p.collab.rested) power += WEIGHTS.collabActive;
  return power;
}

/** ホロメン h の現在の残りHP */
function remainHp(engine, h) {
  return Math.max(0, engine.effectiveHp(h) - h.damage);
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
 */
export function incomingDamageToCenter(engine, attacker, attackerIdx, defenderCenter, { extraCheers = 0 } = {}) {
  if (!defenderCenter) return 0;
  const defColor = defenderCenter.stack[0].color;
  const perAttacker = [];
  for (const pos of ['center', 'collab']) {
    const h = attacker[pos];
    if (!h || h.rested) continue;
    let best = 0;
    for (const a of (h.stack[0].arts || [])) {
      // 今払える、または最善の色で extraCheers 枚足せば払える（=今/今ターン到達可能）
      if (engine._canPayCheers(h.cheers, a.cost) || unmetCost(h.cheers, a.cost) <= extraCheers) {
        best = Math.max(best, artDamageVs(engine, h, a, defColor, attackerIdx));
      }
    }
    if (best > 0) perAttacker.push(best);
  }
  return perAttacker.reduce((s, d) => s + d, 0);
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
  // 相手の脅威は「次ターンに基本エール1枚で解放されるアーツ」も見込む（防御不足を防ぐ。相手の手札効果は見ない）
  const oppToMe = incomingDamageToCenter(engine, opp, 1 - idx, me.center, { extraCheers: 1 });
  if (me.center && oppToMe >= myCenterRemain) parts.lethal += WEIGHTS.lethalThreatToMe;
  const oppCenterRemain = opp.center ? remainHp(engine, opp.center) : 0;
  // 自分のリーサル好機は「今ターン効果で足せるエール（cheer budget）で解放されるアーツ」も見込む
  const meToOpp = incomingDamageToCenter(engine, me, idx, opp.center, { extraCheers: cheerBudgetThisTurn(engine, idx) });
  if (opp.center && meToOpp >= oppCenterRemain) parts.lethal += WEIGHTS.lethalChanceToOpp;

  const total = Object.values(parts).reduce((a, b) => a + b, 0);
  return { total, parts };
}
