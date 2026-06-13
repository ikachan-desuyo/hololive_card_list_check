/**
 * 猫又おかゆ (hBP05-041) 青・Debut・HP100（#ゲーマーズ）
 * アーツ「ぐるぐる～」(20): 相手のセンターホロメンに特殊ダメージ10を与える。
 */
export default {
  number: 'hBP05-041',
  arts: {
    'ぐるぐる～': {
      *run(ctx) {
        const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
        if (center) ctx.dealSpecialDamage(center, 10);
      },
    },
  },
};
