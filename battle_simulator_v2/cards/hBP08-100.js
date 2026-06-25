/**
 * Myth（サポート・イベント・LIMITED）
 * このカードは、自分の手札がこのカードを含まずに6枚以下でなければ使えない。
 * 自分のデッキの上から4枚を見る。その中から、#Mythを持つホロメンを好きな枚数公開し、
 * 公開したホロメンを手札に加える。そして残ったカードを好きな順でデッキの下に戻す。
 * LIMITED：ターンに1枚しか使えない。
 *
 * 実装:
 *  - 使用条件: このカードを含まずに手札6枚以下（=このカード込みで7枚以下）。
 *  - デッキ上4枚を見て #Myth ホロメンを任意枚数（0枚可）手札に加え、残りを好きな順でデッキの下へ。
 *  - LIMITED（ターン1回）はエンジンがcard_typeで管理するためここでは扱わない（hBP01-109 と同様）。
 * 保留: なし。
 */
export default {
  number: 'hBP08-100',
  support: {
    canUse(ctx) {
      // このカードを含まずに手札6枚以下（＝このカード込みで7枚以下）
      return ctx.player.hand.length - 1 <= 6;
    },
    *run(ctx) {
      const looked = ctx.lookTopDeck(4);
      const pool = [...looked];
      const candidates = pool.filter(
        (c) => c.kind === 'holomen' && ctx.hasTag(c, '#Myth'));
      const picked = yield ctx.chooseCards({
        cards: candidates,
        min: 0,
        title: '手札に加える#Mythホロメンを選択（任意）',
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
