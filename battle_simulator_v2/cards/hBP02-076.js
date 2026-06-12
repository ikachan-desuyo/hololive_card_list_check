/**
 * カスタムパソコン（サポート・アイテム）
 * 自分の手札のDebutホロメン1枚を公開し、デッキの下に戻す。
 * 自分のデッキから、戻したホロメンと同じカード名のBuzz以外の1stホロメン1枚を公開し、
 * 手札に加える。そしてデッキをシャッフルする。
 */
export default {
  number: 'hBP02-076',
  support: {
    canUse(ctx) {
      return ctx.player.hand.some((c) => c.kind === 'holomen' && c.bloomLevel === 'Debut');
    },
    *run(ctx) {
      const debuts = ctx.player.hand.filter((c) => c.kind === 'holomen' && c.bloomLevel === 'Debut');
      const returned = yield ctx.chooseCard({
        cards: debuts,
        title: 'デッキの下に戻すDebutホロメンを選択',
      });
      if (!returned) return;
      ctx.removeFromHand(returned);
      ctx.deckToBottom([returned]);
      ctx.log(`${returned.name} をデッキの下に戻した`);

      const candidates = ctx.deckCards((c) =>
        c.kind === 'holomen' && c.bloomLevel === '1st' && !c.buzz && c.name === returned.name);
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: `手札に加える〈${returned.name}〉の1stホロメンを選択`,
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
