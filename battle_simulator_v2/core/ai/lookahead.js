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
 * depth=2（深い先読み）: 自分のターンを終えた後、さらに相手のターンも（公開情報のみで動く HeuristicAI で）
 * 進めてから評価する。これにより「攻めた結果、相手の反撃で不利になる手」を避けられる。
 *   - 公平性: 相手ターンの擬似実行も HeuristicAI が担い、ヒューリスティックは設計上「公開情報のみ」で判断する。
 *     擬似実行のために相手の具体的なカードを内部で動かす必要はあるが、選択は公開情報ベース。
 *   - コスト: 候補ごとに約2ターンぶんを再生・擬似実行するため重い（特に終盤）。UI設定でON/OFF可。
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
    this.depth = opts.depth === 2 ? 2 : 1; // 1=自分のターンのみ / 2=相手の応手まで
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

  /** 候補 candidateId を適用し、自分のターン（depth=2なら相手の応手まで）を進めた後の盤面評価（idx視点） */
  _rolloutValue(engine, candidateId) {
    const idx = this.playerIdx;
    const sim = reconstruct(engine);
    if (!sim.state.pending || !sim.state.pending.options.some((o) => o.id === candidateId)) return -Infinity;
    try { sim.apply(candidateId); } catch { return -Infinity; }
    const ais = [new HeuristicAI(0), new HeuristicAI(1)];
    // 自分のターンが終わる（turnPlayer が相手に移る）か決着するまで、ヒューリスティックで進める。
    // 自分のターン中の相手の割り込み（onDown等。pending.player=相手）も解決する。
    this._advance(sim, ais, (s) => s.turnPlayer === idx);
    // depth=2: さらに相手のターンを最後まで進める（相手の反撃込みで自分の手を評価）。
    if (this.depth >= 2 && sim.state.phase !== 'ended') {
      const opp = 1 - idx;
      this._advance(sim, ais, (s) => s.turnPlayer === opp);
    }
    return evaluateState(sim, idx).total;
  }

  /** while 条件 cont(state)=true の間、ヒューリスティックで決定ポイントを進める（暴走保険つき） */
  _advance(sim, ais, cont) {
    let moves = 0;
    while (sim.state.phase !== 'ended' && sim.state.pending
      && cont(sim.state) && moves < this.maxRolloutMoves) {
      const pd = sim.state.pending;
      const id = pd.player == null ? pd.options[0].id : ais[pd.player].choose(sim);
      if (id == null) break;
      try { sim.apply(id); } catch { break; }
      moves++;
    }
  }
}
