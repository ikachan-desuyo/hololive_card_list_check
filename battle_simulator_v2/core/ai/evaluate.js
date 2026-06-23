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

/**
 * attacker 側が defenderCenter に対して「次の1ターンで与えうる」最大ダメージの概算。
 * 公開情報のみ: attacker 側の盤上ホロメンそれぞれの最大火力（特攻込み）を、センター＋コラボの
 * 最大2回ぶん合計する（おおまかなリーサル脅威の見積り）。
 *
 * projectExtraCheer=true のとき（相手ターンの脅威を読む防御用）: 相手は次ターンに最低1枚エールを
 * 付けられるので、「エール1枚追加で解放されるアーツ」も脅威に数える（過小評価による防御不足を防ぐ）。
 * 自分の攻撃力（この場のリーサル好機）を測る用途では false（エールは既に置かれている）。
 */
export function incomingDamageToCenter(engine, attacker, attackerIdx, defenderCenter, { projectExtraCheer = false } = {}) {
  if (!defenderCenter) return 0;
  const defColor = defenderCenter.stack[0].color;
  const perAttacker = [];
  for (const pos of ['center', 'collab']) {
    const h = attacker[pos];
    if (!h || h.rested) continue;
    let best = 0;
    for (const a of (h.stack[0].arts || [])) {
      let reachable = engine._canPayCheers(h.cheers, a.cost);
      if (!reachable && projectExtraCheer) {
        // エール1枚追加（最も都合のよい色）で解放されるか
        for (const col of new Set(a.cost)) {
          if (engine._canPayCheers([...h.cheers, { color: col }], a.cost)) { reachable = true; break; }
        }
      }
      if (reachable) best = Math.max(best, artDamageVs(engine, h, a, defColor, attackerIdx));
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
  // 相手の脅威は「次ターンにエール1枚追加で解放されるアーツ」も見込む（防御不足を防ぐ）
  const oppToMe = incomingDamageToCenter(engine, opp, 1 - idx, me.center, { projectExtraCheer: true });
  if (me.center && oppToMe >= myCenterRemain) parts.lethal += WEIGHTS.lethalThreatToMe;
  const oppCenterRemain = opp.center ? remainHp(engine, opp.center) : 0;
  const meToOpp = incomingDamageToCenter(engine, me, idx, opp.center);
  if (opp.center && meToOpp >= oppCenterRemain) parts.lethal += WEIGHTS.lethalChanceToOpp;

  const total = Object.values(parts).reduce((a, b) => a + b, 0);
  return { total, parts };
}
