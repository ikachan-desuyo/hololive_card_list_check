/**
 * 輪堂千速 (hBP07-033) 緑・1st・HP160（#DEV_IS #FLOW #GLOW）
 * ブルームエフェクト「ティールマーメイド」:
 *   自分のこのターンにBloomした #FLOW #GLOW を持つホロメン1人を選ぶ。
 *   このターンの間、選んだホロメンのアーツ+30。
 * アーツ「～Something blue～ 千速」(50): 追加効果なし。
 */
export default {
  number: 'hBP07-033',
  bloomEffect: {
    name: 'ティールマーメイド',
    *run(ctx) {
      const turn = ctx.state.turn;
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) =>
          e.holomem.bloomedTurn === turn &&
          ctx.hasTag(e.top, 'FLOW') &&
          ctx.hasTag(e.top, 'GLOW'),
        title: 'このターン アーツ+30する、このターンにBloomした #FLOW #GLOW ホロメンを選択',
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
