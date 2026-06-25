/**
 * 先読みAI（1手／2手先読み・再生ベース）
 *
 * 方針: 主要な戦略決定（メインステップの行動）について、各候補を「実際に適用し、自分のターンを
 * 最後までヒューリスティックで進めた後の盤面評価(evaluateState)」で比較し、最も良くなる手を選ぶ。
 *   - 候補の試行は reconstruct（決定列の再生）で行うため、元の対戦を一切壊さない（スナップショット不要）。
 *   - ロールアウト中の細かい選択・相手の割り込みは HeuristicAI に委ねる（先読みの再帰はしない）。
 *   - メイン以外の決定（エール送付・効果選択・パフォーマンス等）は HeuristicAI に委ねる。
 *
 * これにより「今ターン削り切れないなら攻めずに育てる」「センターに盛らずコラボ含めた方が良い」等、
 * 単発ヒューリスティックでは捉えにくい“ターンを通した結果”で手を選べる（デッキ非依存）。
 *
 * turns（先読みターン数・深さ）: 候補手を適用後、合計 turns ぶんの「プレイヤーのターン」を擬似実行してから評価する。
 *   - turns=1: 自分のターンを終えた局面で評価（最速。目先の最善）。
 *   - turns=2: ＋相手の応手まで読む（攻めて倒し返される手を避ける）。
 *   - turns=3: ＋自分の次のターンまで読む（倒し返されても取り返せるかを見て、消極化を打ち消す＝攻めの精度UP）。
 *   - 情報前提【全情報許可】: 擬似実行は再生(replay)で相手の実際の手札・山札・順序を再現する＝完全情報の前方シミュレーション。
 *     相手の手は「最善で固定」して読み（最悪ケース想定）、揺らぎ(モンテカルロ)は自分の手だけに入れる。
 *   - コスト: turns を増やすほど重い（候補ごとに turns ターンぶんを再生・擬似実行）。UI設定で 1/2/3 を選択可。
 *
 * 注意: reconstruct は「apply() のみで到達した状態」を前提とする（状態を直接書き換えた局面は再現不可）。
 * 実対戦・CPU対戦は全て apply() 経由なので問題ない。
 */

import { HeuristicAI } from './heuristic.js';
import { evaluateState } from './evaluate.js';
import { reconstruct } from './rollout.js';
import { scoreOptions, bestOptionId, isDevelopSupport } from './score.js';
import { createRng } from '../rng.js';

// ロールアウト評価が「ほぼ互角」とみなす差（この範囲内の候補は、ヒューリスティック事前評価で優劣を割る）。
const ROLLOUT_TIE_EPS = 15;
// モンテカルロ: 各候補のロールアウトを方策に揺らぎを入れて複数回回し平均する（脆い1本の偏りを打ち消す）。
const ROLLOUT_RANDOM_MARGIN = 12; // 最善スコアからこの範囲内の手を「ほぼ同等」とみなしランダムに選ぶ（質は保つ）

export class LookaheadAI {
  constructor(playerIdx, opts = {}) {
    this.playerIdx = playerIdx;
    this.fallback = new HeuristicAI(playerIdx);
    this.maxRolloutMoves = opts.maxRolloutMoves || 80; // 1ターンあたりのロールアウト暴走保険
    // 先読みターン数（1以上）。opts.depth は後方互換（2=2手）。
    this.turns = Math.max(1, opts.turns || opts.depth || 1);
    // モンテカルロ標本数。1手は揺れが小さいので1、2手以上は複数回平均して頑健化（既定3）。
    this.samples = Math.max(1, opts.samples != null ? opts.samples : (this.turns >= 2 ? 3 : 1));
  }

  choose(engine) {
    const s = engine.state;
    const pending = s.pending;
    if (!pending) return null;
    // 自分の「メイン行動」と「パフォーマンス(攻撃)」を先読み対象にする。
    // （メイン＝配置/ブルーム/コラボ/バトン等の戦術、パフォーマンス＝どの攻撃をどの順で・どこへ。）
    // それ以外（エール送付・効果選択等）はヒューリスティックに委ねる。
    const isLookaheadStep = (pending.type === 'main' || pending.type === 'performance')
      && pending.player === this.playerIdx;
    if (!isLookaheadStep) {
      return this.fallback.choose(engine);
    }
    const cands = pending.options;
    if (!cands || cands.length === 0) return null;
    if (cands.length === 1) return cands[0].id;

    // 「未来のアタッカーの土台＝盤面を作る発展手」は評価上の上がり幅が小さく、ノイズを含む5手ロールアウトでは
    // 「パス」と僅差になり取りこぼすことがある。これらは無条件で正しい発展手なので先読みに掛けず貪欲に実行する。
    //   - Debut/Spotの展開(place)。置いた次ターンからブルーム可能＝早く置くほど良い。
    //   - デッキからホロメンをステージに出す発展支援(ふつうのパソコン等。placeと同等＋デッキ圧縮)。
    // ※ドロー/サーチ主体の支援は「デッキ切れの綱引き」があるため貪欲にせず先読みの判断に委ねる。
    if (pending.type === 'main') {
      const me = s.players[this.playerIdx];
      // 発展支援(ふつうのパソコン等)を place より先に（盤面が埋まって canUse を満たせなくなる前に使う）。
      const devSup = cands.find((o) => o.kind === 'support' && me.hand[o.handIndex] && isDevelopSupport(engine, me.hand[o.handIndex]));
      if (devSup) return devSup.id;
      const place = cands.find((o) => o.kind === 'place');
      if (place) return place.id;
    }

    // ヒューリスティックの事前評価（prior）。ロールアウトが僅差の時の「無駄手（負の値）」回避に使う。
    let hscores = {};
    try { hscores = scoreOptions(engine, this.playerIdx, pending) || {}; } catch { hscores = {}; }
    // 各候補を samples 回ロールアウトして平均（方策に揺らぎを入れ、脆い1本の偏りを打ち消す）。
    // 標本kは全候補で同じ乱数列（common random numbers）を使い、候補間の比較分散を抑える。
    const scored = cands.map((opt) => {
      let sum = 0; let n = 0;
      for (let k = 0; k < this.samples; k++) {
        const v = this._rolloutValue(engine, opt.id, this.samples > 1 ? createRng(0x9e37 + k * 2654435761) : null);
        if (Number.isFinite(v)) { sum += v; n++; }
      }
      return {
        id: opt.id,
        roll: n > 0 ? sum / n : -Infinity,
        prior: Number.isFinite(hscores[opt.id]) ? hscores[opt.id] : 0,
      };
    });
    const maxRoll = Math.max(...scored.map((s) => s.roll));
    if (!Number.isFinite(maxRoll)) return this.fallback.choose(engine);
    // ロールアウトがほぼ最善(差≤EPS)の候補の中で、ヒューリスティック事前評価が最も高い手を選ぶ。
    // → 明確なロールアウト差があればそちらが勝ち（先読みの強み維持）、僅差なら無駄手をヒューリスティックで除外。
    let best = null;
    for (const s of scored) {
      if (s.roll < maxRoll - ROLLOUT_TIE_EPS) continue;
      if (!best || s.prior > best.prior || (s.prior === best.prior && s.roll > best.roll)) best = s;
    }
    return best ? best.id : this.fallback.choose(engine);
  }

  /** 候補 candidateId を適用し、合計 this.turns ターンぶん擬似実行した後の盤面評価（idx視点）。
   *  rng を渡すと、ロールアウト中の主要決定(main/performance)を「最善付近からランダム」に選ぶ（モンテカルロ用）。 */
  _rolloutValue(engine, candidateId, rng = null) {
    const idx = this.playerIdx;
    const sim = reconstruct(engine);
    if (!sim.state.pending || !sim.state.pending.options.some((o) => o.id === candidateId)) return -Infinity;
    try { sim.apply(candidateId); } catch { return -Infinity; }
    const ais = [new HeuristicAI(0), new HeuristicAI(1)];
    const cap = this.maxRolloutMoves * this.turns;
    let prev = sim.state.turnPlayer;
    let transitions = 0;
    let moves = 0;
    while (sim.state.phase !== 'ended' && sim.state.pending && moves < cap) {
      if (sim.state.turnPlayer !== prev) {
        prev = sim.state.turnPlayer;
        if (++transitions >= this.turns) break; // this.turns ターン分を擬似実行し終えた
      }
      const pd = sim.state.pending;
      let id;
      if (pd.player == null) id = pd.options[0].id;
      // 【全情報許可】相手の手は「最善で固定」して読む（相手の最善応手を想定＝こちらの楽観バイアスを排除）。
      // 揺らぎ(モンテカルロ)は自分の手だけに入れる＝「自分の指し回しの不確実性」を平均し、相手は最悪ケースで評価。
      else if (rng && pd.player === idx) id = stochasticChoose(sim, pd.player, rng);
      else id = ais[pd.player].choose(sim);
      if (id == null) break;
      try { sim.apply(id); } catch { break; }
      moves++;
    }
    return evaluateState(sim, idx).total;
  }
}

/**
 * ロールアウト用の確率的方策。主要決定(main/performance)では「最善スコアから ROLLOUT_RANDOM_MARGIN 以内、かつ
 * パス基準以上」の手をランダムに1つ選ぶ（質は保ちつつ軌跡に揺らぎを与える）。それ以外の決定は決定的に最善。
 */
function stochasticChoose(engine, idx, rng) {
  const pending = engine.state.pending;
  if (!pending) return null;
  if (pending.type !== 'main' && pending.type !== 'performance') return bestOptionId(engine, idx);
  let scores = {};
  try { scores = scoreOptions(engine, idx, pending) || {}; } catch { return bestOptionId(engine, idx); }
  const opts = pending.options;
  const baseline = opts.find((o) => o.kind === 'pass' || o.id === 'done');
  const baseScore = baseline ? (scores[baseline.id] ?? 0) : -Infinity;
  let bestScore = -Infinity;
  for (const o of opts) { const sc = scores[o.id]; if (Number.isFinite(sc) && sc > bestScore) bestScore = sc; }
  if (!Number.isFinite(bestScore)) return baseline ? baseline.id : opts[0].id;
  const near = opts.filter((o) => {
    const sc = scores[o.id] ?? -Infinity;
    return sc >= bestScore - ROLLOUT_RANDOM_MARGIN && sc >= baseScore; // 最善付近 かつ パス以上（明確に悪い手は選ばない）
  });
  if (near.length <= 1) return near.length === 1 ? near[0].id : (baseline ? baseline.id : opts[0].id);
  return near[Math.floor(rng() * near.length) % near.length].id;
}
