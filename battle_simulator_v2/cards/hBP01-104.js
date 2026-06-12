/**
 * ふつうのパソコン（サポート・アイテム）
 * 自分のデッキから、Debutホロメン1枚を公開し、ステージに出す。そしてデッキをシャッフルする。
 */
export default {
  number: 'hBP01-104',
  support: {
    canUse(ctx) {
      // ステージ上限(6)に空きがなければ出せない
      return ctx.engine._stageCount(ctx.player) < 6;
    },
    *run(ctx) {
      const candidates = ctx.deckCards((c) => c.kind === 'holomen' && c.bloomLevel === 'Debut');
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: 'ステージに出すDebutホロメンを選択',
        optional: true,
        skipLabel: '見つからなかったことにする',
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.putToBack(picked);
      }
      ctx.shuffleDeck();
    },
  },
};
