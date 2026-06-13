/**
 * 宝鐘マリン (hBP04-038) 赤・HP200
 * ブルームエフェクト「どこ見ちゃってるのかな～！！♥♡」:
 *   相手のセンターホロメンとコラボホロメンに特殊ダメージ10を与える。
 * アーツ「えっち♥♥」(50+ / 赤無 / 特攻 緑+50):
 *   このホロメンに重なっているホロメン1枚につき、このアーツ+20。
 */
export default {
  number: 'hBP04-038',
  bloomEffect: {
    name: 'どこ見ちゃってるのかな～！！♥♡',
    *run(ctx) {
      for (const entry of ctx.holomems('opp', (e) => e.pos.zone === 'center' || e.pos.zone === 'collab')) {
        ctx.dealSpecialDamage(entry, 10);
      }
    },
  },
  arts: {
    'えっち♥♥': {
      dmgBonus(ctx) {
        // 重なっているホロメン = スタックの一番上を除いた枚数
        return Math.max(0, (ctx.sourceHolomem?.stack.length || 1) - 1) * 20;
      },
    },
  },
};
