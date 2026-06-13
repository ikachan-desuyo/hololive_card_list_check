/**
 * AZKi (hBP07-064) 紫・Debut・HP130（#JP #0期生 #歌）
 * アーツ「ゆっくりしにおいで♡」(20):
 *   自分のデッキから、〈開拓者〉1枚を公開し、自分の〈AZKi〉に付ける。そしてデッキをシャッフルする。
 *   ・〈開拓者〉 = カード名「開拓者」のサポートカード。
 *   ・〈AZKi〉 = 自分のステージ上の、カード名に「AZKi」を含むホロメン（複数いれば選択）。
 */
export default {
  number: 'hBP07-064',
  arts: {
    'ゆっくりしにおいで♡': {
      *run(ctx) {
        // デッキから〈開拓者〉を1枚探す（見つからなければシャッフルのみ）
        const pioneers = ctx.deckCards((c) => c.name === '開拓者');
        // 付け先となる自分の〈AZKi〉ホロメン
        const azkis = ctx.holomems('self', (e) => e.top.name === 'AZKi');
        if (pioneers.length === 0 || azkis.length === 0) {
          ctx.shuffleDeck();
          return;
        }
        const picked = yield ctx.chooseCard({
          cards: pioneers,
          title: 'デッキから付ける〈開拓者〉を選択',
          optional: true,
          skipLabel: '付けない',
        });
        if (!picked) {
          ctx.shuffleDeck();
          return;
        }
        let target = azkis[0];
        if (azkis.length > 1) {
          target = yield ctx.chooseHolomem({
            side: 'self',
            filter: (e) => e.top.name === 'AZKi',
            title: '〈開拓者〉を付ける〈AZKi〉を選択',
          });
        }
        if (target) {
          ctx.removeFromDeck(picked);
          ctx.flashReveal(picked);
          yield* ctx.attachSupportWithTrigger(picked, target.holomem);
        }
        ctx.shuffleDeck();
      },
    },
  },
};
