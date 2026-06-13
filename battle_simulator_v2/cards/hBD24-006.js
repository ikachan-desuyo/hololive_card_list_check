/**
 * クレイジー・オリー (hBD24-006) 推しホロメン・紫
 *
 * 推しスキル「パープルエンハンス」[ホロパワー：-2][ターンに1回]:
 *   このターンの間、自分の紫ホロメン1人のアーツ+20。
 *   → oshiSkill（能動）。自分の紫ホロメンを1人選び、このターンの間アーツ+20。
 *      コスト[ホロパワー：-2]はエンジンが処理するため run には書かない。
 *
 * SP推しスキル「Birthday Gift ～Purple～」[ホロパワー：-2][ゲームに1回]:
 *   自分のデッキから、紫ホロメン1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → spOshiSkill（能動）。デッキ内の紫ホロメンを1枚選び公開して手札へ。その後デッキをシャッフル。
 *      （hBP01-002 のイベントサーチと同形。色＝紫・kind＝holomen で絞る）
 *
 * 保留: なし
 */
export default {
  number: 'hBD24-006',

  oshiSkill: {
    name: 'パープルエンハンス',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // 自分の紫ホロメンが1人以上いる時のみ意味がある
      return engine._stageHolomems(p).some((h) => h.stack[0] && h.stack[0].color === '紫');
    },
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.top && e.top.color === '紫',
        title: 'アーツ+20する紫ホロメンを選択',
      });
      if (!entry) return;
      const target = entry.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus', amount: 20, ownerIdx: ctx.playerIdx,
        match: (h) => h === target,
        description: `このターンの間、${target.stack[0].name}（紫）のアーツ+20`,
      });
    },
  },

  spOshiSkill: {
    name: 'Birthday Gift ～Purple～',
    *run(ctx) {
      const mems = ctx.deckCards((c) => c.kind === 'holomen' && c.color === '紫');
      if (mems.length === 0) {
        ctx.log(`${ctx.player.name}: デッキに紫ホロメンが無い`);
        ctx.shuffleDeck();
        return;
      }
      const picked = yield ctx.chooseCard({
        cards: mems,
        title: '手札に加える紫ホロメンを選択',
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked, { reveal: true });
      }
      ctx.shuffleDeck();
    },
  },
};
