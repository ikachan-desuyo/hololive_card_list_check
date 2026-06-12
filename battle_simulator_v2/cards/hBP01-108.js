/**
 * じゃあ敵だね（サポート・イベント・LIMITED）
 * 相手のセンターホロメンとバックホロメン1人を交代させる。
 */
export default {
  number: 'hBP01-108',
  support: {
    canUse(ctx) {
      return !!ctx.opponent.center && ctx.opponent.back.length > 0;
    },
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'opp',
        filter: (e) => e.pos.zone === 'back',
        title: '相手のセンターと交代させるバックホロメンを選択',
      });
      if (!entry) return;
      const opp = ctx.opponent;
      const i = entry.pos.index;
      const center = opp.center;
      opp.center = opp.back[i];
      opp.back[i] = center;
      ctx.log(`${opp.center.stack[0].name} が相手のセンターに移動（交代）`);
    },
  },
};
