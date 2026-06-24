/**
 * 先読み（ロールアウト）基盤 — スナップショット不要の「再生(replay)」方式。
 *
 * エンジンは完全に決定的（乱数はシード付きRNGのみ・Math.random/Date 不使用）なので、
 * 「現在の状態」は (初期デッキ構成 + シード + 適用した決定列) から一意に再現できる。
 * よって生状態のコピー（スナップショット/クローン）は不要で、まっさらなエンジンで
 * 決定列を最初から再生すれば同じ状態が手に入る。
 *
 * クローンと違い、ターン修正のクロージャ（ホロメンを参照で掴む）も再生時に新エンジン上の
 * 正しいオブジェクトを掴んで再構築されるため壊れない。
 *
 * 公平性: 先読みは「自分のターンの候補→結果盤面」を、公開情報のみの evaluateState で評価する用途。
 */

import { Engine, cloneGameDeck } from '../engine.js';

/**
 * engine の現在状態を、独立した新エンジンで再生して再現する（engine 自身は一切変更しない）。
 * @returns {Engine} 同じ盤面・同じ決定ポイントまで進めた新しいエンジン
 */
export function reconstruct(engine) {
  const ri = engine._replayInfo;
  const fresh = new Engine({
    decks: ri.decks.map(cloneGameDeck), // 毎回独立コピー（相互汚染を防ぐ）
    seed: ri.seed,
    firstPlayer: ri.firstPlayer,
    names: ri.names,
    registry: engine.registry, // 効果定義は不変なので共有してよい
    // 再生時に決定ポイントの構造を一致させるため、挙動に関わる設定は元エンジンに合わせる
    stepPauses: engine.stepPauses,
    confirmOptionalEffects: engine.confirmOptionalEffects,
    onChange: () => {},
  });
  fresh.start();
  for (const id of engine.state.appliedIds) {
    if (fresh.state.phase === 'ended' || !fresh.state.pending) break;
    try { fresh.apply(id); } catch { break; }
  }
  return fresh;
}

/**
 * 現在の決定ポイントで候補 candidateId を適用した「直後の状態」を、再生で得て評価する。
 * 元エンジンは変更しない。評価は idx 視点の公開情報評価（evaluateState）。
 * @returns {number|null} 候補適用後の盤面評価値（候補が不正なら null）
 */
export function evaluateCandidate(engine, idx, candidateId, evaluateState) {
  const sim = reconstruct(engine);
  if (!sim.state.pending) return null;
  if (!sim.state.pending.options.some((o) => o.id === candidateId)) return null;
  try { sim.apply(candidateId); } catch { return null; }
  return evaluateState(sim, idx).total;
}
