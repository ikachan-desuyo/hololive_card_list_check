/**
 * 星街すいせい (hBP05-036) 赤・Debut・HP110（#0期生）
 * アーツ「声出し最高！」(20+): 相手のバックホロメンのHPが減っているなら、このアーツ+20。
 */
export default {
  number: 'hBP05-036',
  arts: {
    '声出し最高！': {
      dmgBonus(ctx) {
        return ctx.holomems('opp', (e) => e.pos.zone === 'back' && e.holomem.damage > 0).length > 0 ? 20 : 0;
      },
    },
  },
};
