/**
 * ラプラス・ダークネス (hBP04-055) 紫・HP100
 * コラボエフェクト「そこに跪け！」:
 *   サイコロを1回振れる：3以上の時、相手のバックホロメン1人をお休みさせる。
 * アーツ「我ら、エデンの星を統べる者！」(30+ / 紫):
 *   相手のお休みしているホロメン1人につき、このアーツ+10。
 */
export default {
  number: 'hBP04-055',
  collabEffect: {
    name: 'そこに跪け！',
    *run(ctx) {
      const ok = yield ctx.confirm('サイコロを振りますか？', '振る', '振らない');
      if (!ok) return;
      const v = (yield* ctx.rollDice());
      if (v >= 3) {
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.pos.zone === 'back' && !e.holomem.rested,
          title: 'お休みさせる相手のバックホロメンを選択',
        });
        if (target) {
          target.holomem.rested = true;
          ctx.log(`${target.top.name} をお休みさせた`);
        }
      }
    },
  },
  arts: {
    '我ら、エデンの星を統べる者！': {
      dmgBonus(ctx) {
        return ctx.holomems('opp', (e) => e.holomem.rested).length * 10;
      },
    },
  },
};
