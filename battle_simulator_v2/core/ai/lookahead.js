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
 *   - 公平性: 各ターンの擬似実行は公開情報のみで判断する HeuristicAI が担う（相手の手札を覗いて選択は変えない）。
 *     擬似実行のため相手の具体的カードを内部で動かす必要はあるが、選択ロジックは公開情報ベース。
 *   - コスト: turns を増やすほど重い（候補ごとに turns ターンぶんを再生・擬似実行）。UI設定で 1/2/3 を選択可。
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
    this.maxRolloutMoves = opts.maxRolloutMoves || 80; // 1ターンあたりのロールアウト暴走保険
    // 先読みターン数（1以上）。opts.depth は後方互換（2=2手）。
    this.turns = Math.max(1, opts.turns || opts.depth || 1);
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

  /** 候補 candidateId を適用し、合計 this.turns ターンぶん擬似実行した後の盤面評価（idx視点） */
  _rolloutValue(engine, candidateId) {
    const idx = this.playerIdx;
    const sim = reconstruct(engine);
    if (!sim.state.pending || !sim.state.pending.options.some((o) => o.id === candidateId)) return -Infinity;
    try { sim.apply(candidateId); } catch { return -Infinity; }
    const ais = [new HeuristicAI(0), new HeuristicAI(1)];
    // ターンの切り替わり（turnPlayer の変化）を数え、this.turns ターン進んだら終了。
    // ターン中の相手割り込み（onDown等。pending.player=相手）も都度ヒューリスティックで解決する。
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
      const id = pd.player == null ? pd.options[0].id : ais[pd.player].choose(sim);
      if (id == null) break;
      try { sim.apply(id); } catch { break; }
      moves++;
    }
    return evaluateState(sim, idx).total;
  }
}
