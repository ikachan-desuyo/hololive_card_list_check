/**
 * かなた建設（サポート・イベント・LIMITED）
 * このカードは、自分の手札がこのカードを含まずに6枚以下でなければ使えない。
 * 自分のデッキの上から4枚を見る。その中から、〈天音かなた〉と〈AZKi〉と〈沙花叉クロヱ〉を
 * 好きな枚数公開し、公開したホロメンを手札に加える。
 * そして残ったカードを好きな順でデッキの下に戻す。
 * LIMITED：ターンに1枚しか使えない。
 */
const NAMES = ['天音かなた', 'AZKi', '沙花叉クロヱ'];

export default {
  number: 'hBP02-078',
  support: {
    canUse(ctx) {
      // このカードを含まずに手札6枚以下（＝このカード込みで7枚以下）
      return ctx.player.hand.length - 1 <= 6;
    },
    *run(ctx) {
      const looked = ctx.lookTopDeck(4);
      const pool = [...looked];
      // 〈天音かなた〉〈AZKi〉〈沙花叉クロヱ〉を好きな枚数（0枚可）一度に選んで手札に加える
      const candidates = pool.filter(
        (c) => c.kind === 'holomen' && NAMES.some((n) => ctx.nameIs(c, n)));
      const picked = yield ctx.chooseCards({
        cards: candidates,
        min: 0,
        title: '手札に加える〈天音かなた〉〈AZKi〉〈沙花叉クロヱ〉を選択（任意・好きな枚数）',
        displayCards: pool, // 見た4枚は対象外のカードも表示する
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
