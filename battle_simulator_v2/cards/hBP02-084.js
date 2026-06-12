/**
 * みっころね24（サポート・イベント・LIMITED）
 * 自分のデッキを2枚引き、サイコロを1回振る：
 *   3か5か6の時、デッキからDebutホロメン1枚を公開し手札に加え、デッキをシャッフルする。
 *   2か4の時、自分のデッキを1枚引く。
 */
export default {
  number: 'hBP02-084',
  support: {
    *run(ctx) {
      ctx.draw(2);
      const dice = ctx.rollDice();
      if ([3, 5, 6].includes(dice)) {
        const candidates = ctx.deckCards((c) => c.kind === 'holomen' && c.bloomLevel === 'Debut');
        const picked = yield ctx.chooseCard({
          cards: candidates,
          title: 'デッキから手札に加えるDebutホロメンを選択',
          optional: true,
          skipLabel: '見つからなかったことにする',
        });
        if (picked) {
          ctx.removeFromDeck(picked);
          ctx.addToHand(picked);
        }
        ctx.shuffleDeck();
      } else if ([2, 4].includes(dice)) {
        ctx.draw(1);
      }
    },
  },
};
