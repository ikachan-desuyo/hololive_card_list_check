/**
 * 尾丸ポルカ (hBP05-031) 赤・Debut・HP90（#5期生）
 * アーツ「あゝ素晴らしきアイドル人生かな」(30): 自分が後攻で最初のターンなら、
 *   自分のデッキから、〈座員〉1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 */
export default {
  number: 'hBP05-031',
  arts: {
    'あゝ素晴らしきアイドル人生かな': {
      *run(ctx) {
        if (!ctx.isFirstTurnGoingSecond()) return;
        const cand = ctx.deckCards((c) => c.name === '座員');
        const picked = yield ctx.chooseCard({
          cards: cand,
          title: '手札に加える〈座員〉を選択（任意）',
          optional: true,
          skipLabel: '見つからなかったことにする',
        });
        if (picked) {
          ctx.removeFromDeck(picked);
          ctx.addToHand(picked);
        }
        ctx.shuffleDeck();
      },
    },
  },
};
