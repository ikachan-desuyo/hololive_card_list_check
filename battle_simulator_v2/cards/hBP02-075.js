/**
 * アイドルサインペン（サポート・アイテム・LIMITED）
 * このカードは、自分の手札がこのカードを含まずに6枚以下でなければ使えない。
 * 自分のデッキの上から4枚を見る。その中から、#絵を持つホロメンを好きな枚数公開し、
 * 手札に加える。そして残ったカードを好きな順でデッキの下に戻す。
 */
export default {
  number: 'hBP02-075',
  support: {
    canUse(ctx) {
      return ctx.player.hand.length - 1 <= 6;
    },
    *run(ctx) {
      const looked = ctx.lookTopDeck(4);
      const pool = [...looked];
      const candidates = pool.filter((c) => c.kind === 'holomen' && ctx.hasTag(c, '絵'));
      const picked = yield ctx.chooseCards({
        cards: candidates,
        min: 0, // 好きな枚数（0可）
        title: '手札に加える #絵 のホロメンを選択（任意）',
        displayCards: looked, // 見た4枚は対象外のカードも表示する
      });
      for (const c of picked) {
        pool.splice(pool.indexOf(c), 1);
        ctx.addToHand(c);
      }
      // 残りは好きな順でデッキの下へ
      const ordered = yield* ctx.orderCardsFlow(pool, 'デッキの下に戻す順番');
      ctx.deckToBottom(ordered);
      if (ordered.length > 0) ctx.log(`残り${ordered.length}枚をデッキの下に戻した`);
    },
  },
};
