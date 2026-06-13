/**
 * あとは任せた！ (hBP01-106) サポート・イベント
 * [サポート効果] 自分のセンターホロメンとお休みしていないバックホロメン1人を交代させる。
 *   → 交代対象は「お休みしていない」バックホロメンに限る（rested === false）。
 */
export default {
  number: 'hBP01-106',
  support: {
    canUse(ctx) {
      const p = ctx.player;
      if (!p.center) return false;
      return ctx.holomems('self', (e) => e.pos.zone === 'back' && !e.holomem.rested).length > 0;
    },
    *run(ctx) {
      const p = ctx.player;
      if (!p.center) return;
      const candidates = ctx.holomems('self', (e) => e.pos.zone === 'back' && !e.holomem.rested);
      if (candidates.length === 0) return;
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.pos.zone === 'back' && !e.holomem.rested,
        title: 'センターと交代させるバックホロメン（お休みしていない）を選択',
      });
      if (!entry) return;
      const i = entry.pos.index;
      const center = p.center;
      p.center = p.back[i];
      p.back[i] = center;
      ctx.log(`${p.center.stack[0].name} がセンターに移動（交代）`);
    },
  },
};
