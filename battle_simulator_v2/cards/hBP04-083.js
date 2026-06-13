/**
 * 桃鈴ねね (hBP04-083) 黄
 * アーツ「こんねね～」(10):
 *   自分のステージのホロメンが5人以下の時、自分のデッキから、#5期生を持つDebutホロメン1枚を
 *   公開し、ステージに出せる。そしてデッキをシャッフルする。
 */
export default {
  number: 'hBP04-083',
  arts: {
    'こんねね～': {
      *run(ctx) {
        if (ctx.engine._stageCount(ctx.player) > 5) return;
        const cand = ctx.deckCards((c) =>
          c.kind === 'holomen' && c.bloomLevel === 'Debut' && ctx.hasTag(c, '5期生'));
        const picked = yield ctx.chooseCard({
          cards: cand,
          title: 'ステージに出す #5期生 のDebutホロメンを選択（任意）',
          optional: true,
          skipLabel: '出さない / 見つからなかったことにする',
        });
        if (picked) {
          ctx.removeFromDeck(picked);
          ctx.putToBack(picked);
        }
        ctx.shuffleDeck();
      },
    },
  },
};
