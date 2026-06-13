/**
 * 角巻わため (hBP07-009) 白・Debut・HP130（#JP #4期生 #ケモミミ #歌）
 * アーツ「ガブガブ！」(20+): [センターポジション限定]このアーツ+20。
 */
export default {
  number: 'hBP07-009',
  arts: {
    'ガブガブ！': {
      dmgBonus(ctx) {
        return ctx.engine._zoneOf(ctx.sourceHolomem) === 'center' ? 20 : 0;
      },
    },
  },
};
