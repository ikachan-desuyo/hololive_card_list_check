/**
 * ふつうのパソコン（サポート・アイテム）
 * 自分のデッキから、Debutホロメン1枚を公開し、ステージに出す。そしてデッキをシャッフルする。
 */
export default {
  number: 'hBP01-104',
  ai: {
    // 盤面が薄い時の展開手段として高評価
    supportValue({ engine, player }) {
      return engine._stageCount(player) < 4 ? 32 : 6;
    },
  },
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
        // 「ステージに出た時」の onEnter トリガーを誘発する経路で出す
        yield* ctx.putToBackWithTrigger(picked);
      }
      ctx.shuffleDeck();
    },
  },
};
