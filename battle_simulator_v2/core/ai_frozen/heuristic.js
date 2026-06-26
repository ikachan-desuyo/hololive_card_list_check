/**
 * ヒューリスティックAI
 *
 * すべての判断は「選択肢スコアラ（core/ai/score.js）」に一本化されている。
 * CPU はその数値が最大の選択肢を選ぶだけ。人間向けの「評価値表示」も同じスコアラを使うため、
 * CPU と人間が完全に同じ物差しで行動できる。
 *
 * 公平性の設計原則: AIは「そのプレイヤーから見える情報」だけを使う（score.js / evaluate.js で自制）。
 *
 * TODO(将来): 相手の次ターンの増強を見込んだ脅威見積り、限定的な擬似先読み。
 */

import { evaluateState } from './evaluate.js';
import { bestOptionId } from './score.js';

const MAIN_ACTION_CAP = 25; // 1メインステップの行動上限（無限ループ保険）

export class HeuristicAI {
  constructor(playerIdx) {
    this.playerIdx = playerIdx;
    this.mainActionsThisTurn = 0;
    this.lastTurnSeen = 0;
  }

  /** 現在の決定ポイントに対する選択肢IDを返す */
  choose(engine) {
    const s = engine.state;
    const pending = s.pending;
    if (!pending) return null;

    if (s.turn !== this.lastTurnSeen) {
      this.lastTurnSeen = s.turn;
      this.mainActionsThisTurn = 0;
    }

    if (pending.type === 'stepPause') return 'ok';

    if (pending.type === 'main') {
      if (this.mainActionsThisTurn >= MAIN_ACTION_CAP) {
        this.mainActionsThisTurn = 0;
        return 'pass';
      }
      const id = bestOptionId(engine, this.playerIdx, pending);
      if (id === 'pass') this.mainActionsThisTurn = 0;
      else this.mainActionsThisTurn++;
      return id;
    }

    return bestOptionId(engine, this.playerIdx, pending);
  }

  /** エール送付の選択（テスト用に残す薄いラッパ。実体はスコアラ） */
  _chooseCheerTarget(engine, pending) {
    return bestOptionId(engine, this.playerIdx, pending);
  }

  /** 現在の盤面評価（idx 視点）。診断・調整用 */
  _stateValue(engine) {
    return evaluateState(engine, this.playerIdx).total;
  }
}
