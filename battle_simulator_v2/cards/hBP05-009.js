/**
 * 白銀ノエル (hBP05-009) 白・Debut・HP90（#3期生）
 * コラボエフェクト「夏深し」: 自分が後攻で最初のターンなら、自分のデッキから、
 *   1stホロメンの〈白銀ノエル〉1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 */
export default {
  number: 'hBP05-009',
  collabEffect: {
    name: '夏深し',
    *run(ctx) {
      if (!ctx.isFirstTurnGoingSecond()) return;
      const cand = ctx.deckCards((c) =>
        c.kind === 'holomen' && c.bloomLevel === '1st' && c.name === '白銀ノエル');
      const picked = yield ctx.chooseCard({
        cards: cand,
        title: '手札に加える1stの〈白銀ノエル〉を選択（任意）',
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
};
