/**
 * 限界飯 (hBP04-091) サポート・イベント
 * このターンの間、自分の〈一条莉々華〉1人のアーツに必要な無色エール-1。
 * 自分の〈限界飯〉はターンに1回しか使えない。
 */
export default {
  number: 'hBP04-091',
  support: {
    canUse(ctx) {
      // 〈一条莉々華〉がステージにいて、かつ今ターンまだ使っていない
      if (ctx.oncePerTurnUsed('hBP04-091:限界飯')) return false;
      return ctx.holomems('self', (e) => e.top.name === '一条莉々華').length > 0;
    },
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.top.name === '一条莉々華',
        title: 'アーツの必要無色エール-1にする〈一条莉々華〉を選択',
      });
      if (!entry) return;
      ctx.markOncePerTurn('hBP04-091:限界飯');
      const chosen = entry.holomem;
      ctx.addTurnModifier({
        kind: 'artCostReduce', color: '無色', amount: 1, ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターン、${chosen.stack[0].name} のアーツ必要無色-1`,
      });
    },
  },
};
