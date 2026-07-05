/**
 * 紫咲シオン 1st (hBP02-045)
 * ブルームエフェクト「久しぶりの全体ライブーっ！！」:
 * 自分のデッキの上から3枚を見る。その中から、[青ホロメンか紫ホロメン]1枚を公開し、
 * 手札に加える。そして残ったカードを好きな順でデッキの下に戻す。
 */
export default {
  number: 'hBP02-045',
  bloomEffect: {
    name: '久しぶりの全体ライブーっ！！',
    *run(ctx) {
      const looked = ctx.lookTopDeck(3);
      const pool = [...looked];
      const candidates = pool.filter((c) =>
        c.kind === 'holomen' && (c.color === '青' || c.color === '紫'));
      if (candidates.length > 0) {
        const picked = yield ctx.chooseCard({
          cards: candidates,
          title: '手札に加える青/紫ホロメンを選択',
          optional: true,
          skipLabel: '加えない',
          displayCards: pool, // 見た3枚は対象外のカードも表示する
        });
        if (picked) {
          pool.splice(pool.indexOf(picked), 1);
          ctx.addToHand(picked);
        }
      }
      // 残りは好きな順でデッキの下へ
      const ordered = yield* ctx.orderCardsFlow(pool, 'デッキの下に戻す順番');
      ctx.deckToBottom(ordered);
      if (ordered.length > 0) ctx.log(`残り${ordered.length}枚をデッキの下に戻した`);
    },
  },
};
