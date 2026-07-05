/**
 * 白上フブキ (hBP02-011) 白・1st・HP120（#JP #1期生 #ゲーマーズ #ケモミミ #絵）
 * ブルームエフェクト「白上から目をそらしちゃ」:
 *   自分のデッキから、#白上'sキャラクターを持つカード1枚を公開し、手札に加える。
 *   そしてデッキをシャッフルする。
 * アーツ「ダメですよっ！」(40): 効果なし（素のダメージのみ）。
 */
export default {
  number: 'hBP02-011',
  bloomEffect: {
    name: '白上から目をそらしちゃ',
    *run(ctx) {
      const candidates = ctx.deckCards((c) => (c.tags || []).includes("白上'sキャラクター"));
      if (candidates.length === 0) {
        // 候補が無くてもデッキはシャッフルする
        ctx.shuffleDeck();
        return;
      }
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: "デッキから #白上'sキャラクター を持つカード1枚を選び手札に加える",
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked, { reveal: true });
      }
      ctx.shuffleDeck();
    },
  },
};
