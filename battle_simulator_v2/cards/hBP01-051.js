/**
 * 風真いろは (hBP01-051) 緑・Buzzホロメン・1st・HP250（#JP, #秘密結社holoX）
 * アーツ「エールを束ねて」(50+):
 *   [コラボポジション限定]このホロメンのエール1枚につき、このアーツ+20（エールは最大5枚まで）。
 *   → コラボにいる時のみ、付いているエール数×20（最大5枚＝+100）。
 * アーツ「風華の輝き」(70): 効果テキスト無し（素のアーツ）。実装不要。
 */
export default {
  number: 'hBP01-051',
  arts: {
    'エールを束ねて': {
      dmgBonus(ctx) {
        if (ctx.engine._zoneOf(ctx.sourceHolomem) !== 'collab') return 0;
        const cheers = ctx.sourceHolomem?.cheers?.length || 0;
        return Math.min(cheers, 5) * 20;
      },
    },
  },
};
