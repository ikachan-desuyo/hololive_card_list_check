/**
 * 大空スバル (hSD19-008) 黄・1st・HP150・ホロメン（#JP #2期生 #トリ）
 * アーツ「萌え萌えギュン」(20+):
 *   [コラボポジション限定]相手のステージに2ndホロメンがいるなら、このアーツ+20。
 *   → dmgBonus。このホロメンがコラボにいて（_zoneOf==='collab'）、
 *     相手のステージのいずれかのホロメンのトップカードが 2nd（bloomLevel==='2nd'）なら +20。
 *     どちらの条件も満たさなければ +0（素の20）。
 * 保留: なし
 */
export default {
  number: 'hSD19-008',
  arts: {
    '萌え萌えギュン': {
      dmgBonus(ctx) {
        // コラボポジション限定
        if (ctx.engine._zoneOf(ctx.sourceHolomem) !== 'collab') return 0;
        // 相手のステージに 2nd ホロメンがいるか
        const has2nd = ctx.holomems('opp', ({ top }) => top?.bloomLevel === '2nd').length > 0;
        return has2nd ? 20 : 0;
      },
    },
  },
};
