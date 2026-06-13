/**
 * 赤井はあと (hBP07-038) 赤・1st・HP150（#JP #1期生 #料理）
 * ブルームエフェクト「幻獣グルメハンター」:
 *   サイコロを1回振る。奇数なら、相手のセンターホロメンに特殊ダメージ20を与える。
 *   偶数なら、自分のデッキを1枚引く。
 * アーツ「hololiveEN0」(30):
 *   このターンの間、自分のステージの#ENを持つホロメン全員のアーツ+20。
 */
export default {
  number: 'hBP07-038',
  bloomEffect: {
    name: '幻獣グルメハンター',
    *run(ctx) {
      const value = (yield* ctx.rollDice());
      if (value % 2 === 1) {
        const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
        if (center) yield* ctx.dealSpecialDamage(center, 20);
      } else {
        ctx.draw(1);
      }
    },
  },
  arts: {
    'hololiveEN0': {
      *run(ctx) {
        ctx.addTurnModifier({
          kind: 'artsPlus', amount: 20, ownerIdx: ctx.playerIdx,
          match: (h) => (h.stack[0].tags || []).includes('EN'),
          description: 'このターン、自分のステージの#ENホロメン全員のアーツ+20',
        });
      },
    },
  },
};
