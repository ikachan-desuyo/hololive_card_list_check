/**
 * 癒月ちょこ (hBP05-054) ホロメン 紫 1st HP160
 *
 * アーツ「ガァチィ？」[必要エール: 無色1] ダメージ30:
 *   このアーツは、このターンに自分が#食べ物を持つイベントカードを
 *   2枚以上使っていたなら、エール1枚を必要とせずに使える。
 *   → このターンに使った#食べ物イベントが2枚以上なら、必要エール 無色-1（＝0枚で使える）。
 *
 * 実装:
 *   このホロメンのアーツは1種類（ガァチィ？）のみで必要エールは無色1。
 *   条件成立時に「無色-1」の必要エール軽減を artsCostReduceAura で返す。
 *   軽減オーラは src===target（自分自身）の時だけ返し、他ホロメンのアーツには影響させない。
 *   （エンジンのコスト軽減はホロメン単位でアーツ名を渡さないが、本カードはアーツが1種のため問題ない）
 *   「使っていた」枚数は player.supportsPlayedThisTurn（このターンに使ったサポートのカード一覧）で数える。
 *
 * 保留: なし
 */
const isFoodEvent = (c) =>
  c.kind === 'support' && c.supportType === 'イベント' && (c.tags || []).includes('食べ物');

// このターンに自分が使った#食べ物イベントが2枚以上か
function usedTwoFoodEvents(engine, ownerIdx) {
  const p = engine.state.players[ownerIdx];
  return (p.supportsPlayedThisTurn || []).filter(isFoodEvent).length >= 2;
}

export default {
  number: 'hBP05-054',

  // 条件成立時、このホロメン自身のアーツ必要エールを無色-1（＝エール0枚で使える）
  artsCostReduceAura(src, target, engine) {
    if (src !== target) return []; // 自分のアーツにのみ適用
    const ownerIdx = engine.state.players.findIndex(
      (p) => engine._stageHolomems(p).includes(src));
    if (ownerIdx < 0) return [];
    if (!usedTwoFoodEvents(engine, ownerIdx)) return [];
    return [{ color: '無色', amount: 1 }];
  },
};
