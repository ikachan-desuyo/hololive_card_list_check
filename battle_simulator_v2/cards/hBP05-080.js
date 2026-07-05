/**
 * SorAZセレブレーション (hBP05-080) サポート・イベント・LIMITED
 * 自分のデッキを2枚引く。その後、自分のデッキの上から5枚を見る。
 * その中から、1stホロメン1枚を公開し、手札に加える。そして残ったカードを好きな順でデッキの下に戻す。
 * LIMITED：ターンに1枚しか使えない。
 */
export default {
  number: 'hBP05-080',
  support: {
    *run(ctx) {
      ctx.draw(2);
      const looked = ctx.lookTopDeck(5);
      const pool = [...looked];
      const candidates = pool.filter((c) => c.kind === 'holomen' && c.bloomLevel === '1st');
      if (candidates.length > 0) {
        const picked = yield ctx.chooseCard({
          cards: candidates,
          title: '手札に加える1stホロメンを選択（任意）',
          optional: true,
          skipLabel: '加えない',
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
