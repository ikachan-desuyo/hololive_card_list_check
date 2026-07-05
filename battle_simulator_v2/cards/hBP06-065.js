/**
 * ロボ子さん (hBP06-065) 紫・Buzz・1st・HP250（#0期生,#シューター）
 * ギフト「一言芳恩」:
 *   1stホロメンからBloomしているこのホロメンがアーツを使った時、
 *   相手のセンターホロメンかコラボホロメンに特殊ダメージ50を与える。
 *   → triggers.onArtsUse（アーツ解決後に発火）
 * アーツ「かけがえのない日々」(90):
 *   「直前の相手のターンに自分のホロメンがダウンしていたなら、このアーツの必要無色-1」
 *   → artsCostReduceAura（自己）で実装。engine が直前の相手ターンにダウンした自分のホロメンを
 *     p.downedCardsLastOppTurn に保持しているので、空でなければ無色-1。
 */
export default {
  number: 'hBP06-065',
  // アーツ「かけがえのない日々」: 直前の相手ターンに自分のホロメンがダウンしていたなら必要無色-1
  artsCostReduceAura(src, target, engine) {
    if (src !== target) return [];
    const ownerIdx = engine.state.players.findIndex((p) => engine._stageHolomems(p).includes(src));
    if (ownerIdx < 0) return [];
    if ((engine.state.players[ownerIdx].downedCardsLastOppTurn || []).length === 0) return [];
    return [{ color: '無色', amount: 1 }];
  },
  triggers: {
    *onArtsUse(ctx) {
      const h = ctx.sourceHolomem;
      // 1stホロメンからBloomしている（重なりの下に1stがある）こと
      if (!h || !(h.stack.length > 1 && h.stack[1].bloomLevel === '1st')) return;
      const target = yield ctx.chooseHolomem({
        side: 'opp',
        filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'collab',
        title: '特殊ダメージ50を与える相手ホロメンを選択（センターかコラボ）',
      });
      if (target) yield* ctx.dealSpecialDamage(target, 50);
    },
  },
};
