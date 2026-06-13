/**
 * 白銀ノエル (hBP02-017) 白・Buzzホロメン・1st・HP260（#3期生 #お酒）
 * アーツ「ゆるふわ脳筋女騎士」(50): 効果なし。
 * アーツ「３期生ぱわー」(60+):
 *   [コラボポジション限定]自分のステージのこのホロメン以外の#3期生を持つホロメン
 *   1人につき、このアーツ+20。ただし、数える人数は4人まで。
 */
export default {
  number: 'hBP02-017',
  arts: {
    '３期生ぱわー': {
      dmgBonus(ctx) {
        // コラボポジション限定
        if (ctx.engine._zoneOf(ctx.sourceHolomem) !== 'collab') return 0;
        const count = ctx.holomems('self', (e) =>
          e.holomem !== ctx.sourceHolomem && ctx.hasTag(e.top, '3期生')
        ).length;
        // 数える人数は4人まで
        return Math.min(count, 4) * 20;
      },
    },
  },
};
