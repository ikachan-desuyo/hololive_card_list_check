/**
 * 先読みAI（1手先読み・再生ベース）
 *
 * 方針: 主要な戦略決定（メインステップの行動）について、各候補を「実際に適用し、自分のターンを
 * 最後までヒューリスティックで進めた後の盤面評価(evaluateState)」で比較し、最も良くなる手を選ぶ。
 *   - 候補の試行は reconstruct（決定列の再生）で行うため、元の対戦を一切壊さない（スナップショット不要）。
 *   - ロールアウト中の細かい選択・相手の割り込みは HeuristicAI に委ねる（先読みの再帰はしない＝1手先読み）。
 *   - メイン以外の決定（エール送付・効果選択・パフォーマンス等）は HeuristicAI に委ねる。
 *
 * これにより「今ターン削り切れないなら攻めずに育てる」「センターに盛らずコラボ含めた方が良い」等、
 * 単発ヒューリスティックでは捉えにくい“ターンを通した結果”で手を選べる（デッキ非依存）。
 *
 * 注意: reconstruct は「apply() のみで到達した状態」を前提とする（状態を直接書き換えた局面は再現不可）。
 * 実対戦・CPU対戦は全て apply() 経由なので問題ない。
 */

import { HeuristicAI } from './heuristic.js';
import { evaluateState } from './evaluate.js';
import { reconstruct } from './rollout.js';

export class LookaheadAI {
  constructor(playerIdx, opts = {}) {
    this.playerIdx = playerIdx;
    this.fallback = new HeuristicAI(playerIdx);
    this.maxRolloutMoves = opts.maxRolloutMoves || 80; // ロールアウトの暴走保険
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

    let bestId = null;
    let bestVal = -Infinity;
    for (const opt of cands) {
      const val = this._rolloutValue(engine, opt.id);
      if (val > bestVal) { bestVal = val; bestId = opt.id; }
    }
    return bestId != null ? bestId : this.fallback.choose(engine);
  }

  /** 候補 candidateId を適用し、自分のターンを最後までヒューリスティックで進めた後の盤面評価（idx視点） */
  _rolloutValue(engine, candidateId) {
    const idx = this.playerIdx;
    const sim = reconstruct(engine);
    if (!sim.state.pending || !sim.state.pending.options.some((o) => o.id === candidateId)) return -Infinity;
    try { sim.apply(candidateId); } catch { return -Infinity; }
    const ais = [new HeuristicAI(0), new HeuristicAI(1)];
    let moves = 0;
    // 自分のターンが終わる（turnPlayer が相手に移る）か決着するまで、ヒューリスティックで進める。
    // 自分のターン中の相手の割り込み（onDown等。pending.player=相手）も解決する。
    while (sim.state.phase !== 'ended' && sim.state.turnPlayer === idx
      && sim.state.pending && moves < this.maxRolloutMoves) {
      const pd = sim.state.pending;
      const id = pd.player == null ? pd.options[0].id : ais[pd.player].choose(sim);
      if (id == null) break;
      try { sim.apply(id); } catch { break; }
      moves++;
    }
    return evaluateState(sim, idx).total;
  }
}
