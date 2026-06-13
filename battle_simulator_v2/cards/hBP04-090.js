/**
 * 作業用パソコン (hBP04-090) サポート・アイテム・LIMITED
 * このカードは、自分の手札がこのカードを含まずに6枚以下でなければ使えない。
 * 自分のデッキの上から4枚を見る。その中から、ホロメン1枚と[ツールかマスコットかファン]1枚を
 * 公開し、公開したカードを手札に加える。そして残ったカードを好きな順でデッキの下に戻す。
 */
const ATTACH_TYPES = ['ツール', 'マスコット', 'ファン'];

export default {
  number: 'hBP04-090',
  support: {
    canUse(ctx) {
      return ctx.player.hand.length - 1 <= 6;
    },
    *run(ctx) {
      const looked = ctx.lookTopDeck(4);
      const pool = looked.slice();
      // ホロメン1枚
      const holos = pool.filter((c) => c.kind === 'holomen');
      if (holos.length > 0) {
        const p1 = yield ctx.chooseCard({
          cards: holos, title: '手札に加えるホロメンを選択（任意）',
          optional: true, skipLabel: '加えない', displayCards: pool,
        });
        if (p1) { pool.splice(pool.indexOf(p1), 1); ctx.addToHand(p1); }
      }
      // [ツール/マスコット/ファン]1枚
      const supp = pool.filter((c) => c.kind === 'support' && ATTACH_TYPES.includes(c.supportType));
      if (supp.length > 0) {
        const p2 = yield ctx.chooseCard({
          cards: supp, title: '手札に加える[ツール/マスコット/ファン]を選択（任意）',
          optional: true, skipLabel: '加えない', displayCards: pool,
        });
        if (p2) { pool.splice(pool.indexOf(p2), 1); ctx.addToHand(p2); }
      }
      const ordered = yield* ctx.orderCardsFlow(pool, 'デッキの下に戻す順番');
      ctx.deckToBottom(ordered);
    },
  },
};
