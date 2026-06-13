/**
 * マスコットキャッチャー (hBP04-095) サポート・イベント・LIMITED
 * 自分のデッキから、マスコット1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 * LIMITED：ターンに1枚しか使えない。
 */
export default {
  number: 'hBP04-095',
  ai: {
    // デッキにマスコットが残っている時のみ価値がある
    supportValue({ player }) {
      return player.deck.some((c) => c.kind === 'support' && c.supportType === 'マスコット') ? 24 : 0;
    },
  },
  support: {
    *run(ctx) {
      const candidates = ctx.deckCards((c) => c.kind === 'support' && c.supportType === 'マスコット');
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: '手札に加えるマスコットを選択',
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
