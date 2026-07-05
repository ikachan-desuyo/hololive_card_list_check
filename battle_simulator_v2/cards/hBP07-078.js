/**
 * 桃鈴ねね (hBP07-078) 黄・Debut・HP110（#JP #5期生 #歌 #絵）
 * コラボエフェクト「君もこっちにおいで～！」:
 *   自分のデッキの上から5枚を見る。その中から、〈ねっ子〉1枚を公開し、手札に加える。
 *   そして残ったカードを好きな順でデッキの下に戻す。
 * アーツ「ねねと一緒に楽しもう！！」(20): テキスト効果なし（ダメージのみ）。
 *
 * ※〈ねっ子〉は名称参照（カード名「ねっ子」）。
 *   テキストは「〈ねっ子〉1枚を公開し」＝最大1枚（デッキ非公開領域のため見つからない可能も保証）。
 */
export default {
  number: 'hBP07-078',
  collabEffect: {
    name: '君もこっちにおいで～！',
    *run(ctx) {
      const looked = ctx.lookTopDeck(5);
      const pool = [...looked];
      const candidates = pool.filter((c) => c.name === 'ねっ子');
      if (candidates.length > 0) {
        const picked = yield ctx.chooseCard({
          cards: candidates,
          title: '手札に加える〈ねっ子〉を選択',
          optional: true,
          skipLabel: '見つからなかったことにする',
          displayCards: pool,
        });
        if (picked) {
          pool.splice(pool.indexOf(picked), 1);
          ctx.addToHand(picked);
        }
      }
      const ordered = yield* ctx.orderCardsFlow(pool, 'デッキの下に戻す順番');
      ctx.deckToBottom(ordered);
      if (ordered.length > 0) ctx.log(`残り${ordered.length}枚をデッキの下に戻した`);
    },
  },
};
