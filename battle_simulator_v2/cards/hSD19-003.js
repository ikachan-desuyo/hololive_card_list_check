/**
 * 大空スバル (hSD19-003) 黄・Debut・HP80・ホロメン（#JP #2期生 #トリ）
 * アーツ「今日もあなたのそばに -スバル-」(20+):
 *   自分のライフが2以下なら、このアーツ+10。
 *   → dmgBonus（自分のライフ枚数 player.life.length が 2 以下なら +10）
 * 保留: なし
 */
export default {
  number: 'hSD19-003',
  arts: {
    '今日もあなたのそばに -スバル-': {
      dmgBonus(ctx) {
        return ctx.player.life.length <= 2 ? 10 : 0;
      },
    },
  },
};
