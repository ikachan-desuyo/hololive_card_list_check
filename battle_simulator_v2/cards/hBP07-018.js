/**
 * ベスティア・ゼータ (hBP07-018) 白・1st・HP160（#ID #ID3期生）
 * コラボエフェクト「Horse Doko?」:
 *   自分のデッキの上から1枚を公開する。
 *   公開したカードがサポートカードなら、そのカードを手札に加える。
 *   サポートカード以外なら、そのカードをデッキの上に戻す。
 *   → lookTopDeck(1) で公開し、kind==='support' なら addToHand、それ以外は deckToTop で戻す
 * アーツ「うまみ～うまみ～♪」(30+):
 *   このターンに自分がイベントを使っていたなら、このアーツ+30。
 *   → dmgBonus で「このターンにイベント(supportType==='イベント')を使ったか」を判定
 */
export default {
  number: 'hBP07-018',
  collabEffect: {
    name: 'Horse Doko?',
    *run(ctx) {
      const [top] = ctx.lookTopDeck(1);
      if (!top) return;
      if (top.kind === 'support') {
        ctx.addToHand(top); // サポートカードなら手札に加える（公開済み）
      } else {
        ctx.deckToTop([top]); // サポートカード以外ならデッキの上に戻す
      }
    },
  },
  arts: {
    'うまみ～うまみ～♪': {
      dmgBonus(ctx) {
        // このターンに自分がイベントを使っていたなら +30
        const usedEvent = ctx.countSupportThisTurn(
          (c) => c.kind === 'support' && c.supportType === 'イベント') > 0;
        return usedEvent ? 30 : 0;
      },
    },
  },
};
