/**
 * IRyS (hBP04-015) 白・Buzzホロメン・1st・HP230（#EN #Promise #歌）
 * アーツ「The Race Queen」(30+):
 *   自分のステージの#Promiseを持つホロメン1人につき、このアーツ+10。
 *   ただし、数える人数は4人まで（=最大+40）。
 *
 * 保留: なし
 */
export default {
  number: 'hBP04-015',
  arts: {
    'The Race Queen': {
      dmgBonus(ctx) {
        const promiseCount = ctx.holomems('self', ({ top }) => ctx.hasTag(top, 'Promise')).length;
        const counted = Math.min(promiseCount, 4); // 数える人数は4人まで
        return counted * 10;
      },
    },
  },
};
