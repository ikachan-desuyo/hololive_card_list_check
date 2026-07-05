/**
 * ラオーラ・パンテーラ (hBP04-016)
 * アーツ「チアオーラ」:
 *   自分のステージのホロメンが5人以下の時、自分のデッキから、#Justiceを持つSpotホロメン
 *   1枚を公開し、ステージに出せる。そしてデッキをシャッフルする。
 */
export default {
  number: 'hBP04-016',
  arts: {
    'チアオーラ': {
      *run(ctx) {
        // ステージ上限は6。5人以下（=空きがある）の時のみ
        if (ctx.engine._stageCount(ctx.player) > 5) return;
        const candidates = ctx.deckCards((c) =>
          c.kind === 'holomen' && c.bloomLevel === 'Spot' && (c.tags || []).includes('Justice'));
        const picked = yield ctx.chooseCard({
          cards: candidates,
          title: 'ステージに出す #Justice の Spotホロメンを選択（任意）',
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
