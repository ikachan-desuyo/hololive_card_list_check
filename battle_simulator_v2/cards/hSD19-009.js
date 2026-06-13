/**
 * 大空スバル (hSD19-009) 黄・2nd・HP180・ホロメン（#JP #2期生 #トリ）
 * アーツ「ダンシング・プレアデス」(80+):
 *   自分のライフが2以下なら、このアーツ+10。
 *   → dmgBonus（自分のライフ枚数 player.life.length が 2 以下なら +10）
 *     hSD19-003（Debut版スバル）と同じ条件付き加算パターン。
 * 保留: なし
 */
export default {
  number: 'hSD19-009',
  arts: {
    'ダンシング・プレアデス': {
      dmgBonus(ctx) {
        return ctx.player.life.length <= 2 ? 10 : 0;
      },
    },
  },
};
