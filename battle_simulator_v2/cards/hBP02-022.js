/**
 * パヴォリア・レイネ 1st (hBP02-022)
 * ブルームエフェクト「What AreYou Waiting For?」:
 *   自分のデッキから、〈Tatang〉1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 * アーツ「Spicy Night」:
 *   自分のステージにエールが2色以上ある時、このアーツ+20。
 */
export default {
  number: 'hBP02-022',
  bloomEffect: {
    name: 'What AreYou Waiting For?',
    *run(ctx) {
      const candidates = ctx.deckCards((c) => c.name === 'Tatang');
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: '手札に加える〈Tatang〉を選択',
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
  arts: {
    'Spicy Night': {
      dmgBonus(ctx) {
        return ctx.ownStageCheerColors().length >= 2 ? 20 : 0;
      },
    },
  },
};
