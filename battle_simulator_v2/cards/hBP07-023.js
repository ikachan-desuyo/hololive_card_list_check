/**
 * 大神ミオ (hBP07-023) 緑・Debut・HP120（#JP #ゲーマーズ #ケモミミ #料理）
 * コラボエフェクト「占いパワー注入！」:
 *   自分が後攻で最初のターンなら、自分のデッキの上から3枚を見る。
 *   その中から、カード1枚を手札に加える。
 *   そして残ったカードを好きな順でデッキの上に戻す。
 * アーツ「MIOON!」(any:30) — テキスト効果なし。
 */
export default {
  number: 'hBP07-023',
  collabEffect: {
    name: '占いパワー注入！',
    *run(ctx) {
      if (!ctx.isFirstTurnGoingSecond()) return;
      const seen = ctx.lookTopDeck(3);
      if (seen.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: seen,
        title: 'デッキの上から3枚のうち1枚を手札に加える',
      });
      ctx.addToHand(picked);
      const rest = seen.filter((c) => c !== picked);
      if (rest.length > 0) {
        const ordered = yield* ctx.orderCardsFlow(rest, '残りをデッキの上に戻す順番');
        ctx.deckToTop(ordered);
      }
    },
  },
};
