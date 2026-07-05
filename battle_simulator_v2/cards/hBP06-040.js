/**
 * ハコス・ベールズ (hBP06-040) 赤・Debut・HP110（#Promise）
 * アーツ「You can do it!」(30): サイコロを1回振る。奇数なら、相手のセンターホロメンとコラボホロメンに
 *   特殊ダメージ10を与える。
 */
export default {
  number: 'hBP06-040',
  arts: {
    'You can do it!': {
      *run(ctx) {
        if ((yield* ctx.rollDice()) % 2 === 1) {
          for (const e of ctx.holomems('opp', (x) => x.pos.zone === 'center' || x.pos.zone === 'collab')) {
            yield* ctx.dealSpecialDamage(e, 10);
          }
        }
      },
    },
  },
};
