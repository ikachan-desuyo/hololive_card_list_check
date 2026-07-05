/**
 * オーロ・クロニー (hBP07-054) 青・1st・Buzzホロメン・HP250（#EN #Promise）
 * アーツ「I'm pretty shy…uwu」(50):
 *   自分のエールデッキの上から1枚を自分の#Promiseを持つBuzzホロメンに送る。
 *   → エールデッキ上の1枚を公開し、対象のBuzz #Promiseホロメンに付ける。
 *     対象が複数いる場合はプレイヤーが選択。対象がいなければ何もしない。
 */
export default {
  number: 'hBP07-054',
  arts: {
    "I'm pretty shy…uwu": {
      *run(ctx) {
        if (ctx.player.cheerDeck.length === 0) return;
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => !!e.top.buzz && ctx.hasTag(e.top, 'Promise'),
          title: 'エールを送る #Promise Buzzホロメンを選択',
        });
        if (!target) return;
        ctx.sendCheerFromCheerDeckTop(target.holomem);
      },
    },
  },
};
