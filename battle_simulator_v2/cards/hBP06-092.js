/**
 * マヨネーズちゅっちゅっ (hBP06-092) サポート・イベント
 * このターンの間、自分のステージの〈博衣こより〉1人のアーツ+30。
 */
export default {
  number: 'hBP06-092',
  support: {
    canUse(ctx) {
      return ctx.holomems('self', (e) => e.top.name === '博衣こより').length > 0;
    },
    *run(ctx) {
      const target = yield ctx.chooseHolomem({
        side: 'self', filter: (e) => e.top.name === '博衣こより',
        title: 'このターン アーツ+30する〈博衣こより〉を選択',
      });
      if (!target) return;
      const chosen = target.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus', amount: 30, ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターン、${chosen.stack[0].name} のアーツ+30`,
      });
    },
  },
};
