/**
 * 癒月ちょこ (hSD04-006) 紫・1st・HP130
 * アーツ「禁断のキッス」(30): このアーツで相手のホロメンにダメージを与えた時、
 *   与えたダメージ10につき、このホロメンのHP10回復。（= 与えたダメージと同量を回復）
 *   → arts.onDamageDealt(ctx, dealt)（実際に与えたダメージ量を受け取って回復）
 */
export default {
  number: 'hSD04-006',
  arts: {
    '禁断のキッス': {
      *onDamageDealt(ctx, dealt) {
        if (ctx.sourceHolomem && dealt > 0) ctx.heal(ctx.sourceHolomem, dealt);
      },
    },
  },
};
