/**
 * ホロライブ1期生 (hBP06-091) サポート・イベント・LIMITED
 * このカードは、自分の手札がこのカードを含まずに6枚以下でなければ使えない。
 * 自分のデッキの上から4枚を見る。その中から、#1期生を持つホロメンを好きな枚数公開し、
 * 公開したホロメンを手札に加える。そして残ったカードを好きな順でデッキの下に戻す。
 * LIMITED：ターンに1枚しか使えない。
 */
export default {
  number: 'hBP06-091',
  support: {
    canUse(ctx) {
      return ctx.player.hand.length - 1 <= 6;
    },
    *run(ctx) {
      const looked = ctx.lookTopDeck(4);
      const pool = [...looked];
      const candidates = pool.filter((c) => c.kind === 'holomen' && ctx.hasTag(c, '1期生'));
      const picked = yield ctx.chooseCards({
        cards: candidates,
        min: 0,
        title: '手札に加える #1期生 のホロメンを選択（好きな枚数）',
        displayCards: pool,
      });
      for (const card of picked) {
        pool.splice(pool.indexOf(card), 1);
        ctx.addToHand(card);
      }
      const ordered = yield* ctx.orderCardsFlow(pool, 'デッキの下に戻す順番');
      ctx.deckToBottom(ordered);
      if (ordered.length > 0) ctx.log(`残り${ordered.length}枚をデッキの下に戻した`);
    },
  },
};
