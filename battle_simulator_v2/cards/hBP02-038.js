/**
 * 沙花叉クロヱ (hBP02-038) 青・1st・HP110（#秘密結社holoX,#海）
 * ブルームエフェクト「君の心をばっくばっくばく～んしちゃうぞ♡」:
 *   自分のエールデッキの上から3枚を見る。その中から、エール1枚を公開し、自分のホロメンに送る。
 *   そして残ったエールを好きな順でエールデッキの下に戻す。
 * アーツ「（ここ喜ぶ所です）」(30): テキスト効果なし。
 */
export default {
  number: 'hBP02-038',
  bloomEffect: {
    name: '君の心をばっくばっくばく～んしちゃうぞ♡',
    *run(ctx) {
      const looked = ctx.lookTopCheerDeck(3);
      if (looked.length === 0) return;
      const pool = [...looked];
      if (ctx.holomems('self').length > 0) {
        const picked = yield ctx.chooseCard({ cards: pool, title: '自分のホロメンに送るエールを選択', displayCards: [] });
        if (picked) {
          const target = yield ctx.chooseHolomem({ side: 'self', title: 'エールを送るホロメンを選択' });
          if (target) {
            pool.splice(pool.indexOf(picked), 1);
            ctx.sendRevealedCheer(picked, target.holomem);
          }
        }
      }
      const ordered = yield* ctx.orderCardsFlow(pool, 'エールデッキの下に戻す順番');
      ctx.cheerDeckToBottom(ordered);
    },
  },
};
