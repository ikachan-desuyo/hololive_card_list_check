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
      while (true) {
        const candidates = pool.filter((c) => c.kind === 'holomen' && ctx.hasTag(c, '絵'));
        if (candidates.length === 0) break;
        const picked = yield ctx.chooseCard({
          cards: candidates,
          title: '手札に加える #絵 のホロメンを選択（任意）',
          optional: true,
          skipLabel: 'これ以上加えない',
        });
        if (!picked) break;
        pool.splice(pool.indexOf(picked), 1);
        ctx.addToHand(picked);
      }
      // 残りはデッキの下へ（順序選択は省略: 今の並び順で戻す）
      ctx.deckToBottom(pool);
      if (pool.length > 0) ctx.log(`残り${pool.length}枚をデッキの下に戻した`);
    },
  },
};
