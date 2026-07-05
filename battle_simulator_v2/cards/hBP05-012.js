/**
 * 白銀ノエル (hBP05-012) 白・2nd・HP220（#3期生）
 * アーツ「騎士団の道」(80+): このホロメンのHPが減っているなら、このアーツ+40。
 * アーツ「慈悲の一撃」(130+): [センターポジション限定]自分の#3期生を持つコラボホロメンがいるなら、このアーツ+30。
 */
export default {
  number: 'hBP05-012',
  arts: {
    '騎士団の道': {
      dmgBonus(ctx) {
        return ctx.sourceHolomem?.damage > 0 ? 40 : 0;
      },
    },
    '慈悲の一撃': {
      dmgBonus(ctx) {
        if (ctx.engine._zoneOf(ctx.sourceHolomem) !== 'center') return 0;
        const hasCollab = ctx.holomems('self', (e) => e.pos.zone === 'collab' && ctx.hasTag(e.top, '3期生')).length > 0;
        return hasCollab ? 30 : 0;
      },
    },
  },
};
