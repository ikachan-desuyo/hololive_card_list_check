/**
 * アユンダ・リス Debut (hBP03-074) 黄・HP80（#ID #ID1期生）
 * アーツ「繋がる願い」(20+):
 *   自分のステージに〈アイラニ・イオフィフティーン〉がいる時、このアーツ+10。
 *   自分のステージに〈ムーナ･ホシノヴァ〉がいる時、このアーツ+10。
 *   （2条件は独立して加算される）
 */
export default {
  number: 'hBP03-074',
  arts: {
    '繋がる願い': {
      dmgBonus(ctx) {
        let bonus = 0;
        const stage = ctx.holomems('self');
        if (stage.some((e) => e.top.name === 'アイラニ・イオフィフティーン')) bonus += 10;
        // カードDB上のホロメン名は全角中黒(・ U+30FB)。本カードのテキストは半角中黒(･)だが照合は実名に合わせる
        if (stage.some((e) => e.top.name === 'ムーナ・ホシノヴァ')) bonus += 10;
        return bonus;
      },
    },
  },
};
