/**
 * オーロ・クロニー (hBP07-055) 青・2nd・HP190（#EN #Promise）
 * ブルームエフェクト「約束の未来へ」:
 *   自分のステージの#Promiseを持つホロメン1人を選ぶ。
 *   このターンの間、選んだホロメンのアーツ+50。
 * アーツ「Life Goes On」(90): 特攻 白+50（エンジンが処理）— 追加効果なし。
 */
export default {
  number: 'hBP07-055',
  bloomEffect: {
    name: '約束の未来へ',
    *run(ctx) {
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.hasTag(e.top, 'Promise'),
        title: 'このターン アーツ+50する #Promise ホロメンを選択',
      });
      if (!target) return;
      const chosen = target.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus', amount: 50, ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターン、${chosen.stack[0].name} のアーツ+50`,
      });
    },
  },
};
