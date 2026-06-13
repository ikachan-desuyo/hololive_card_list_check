/**
 * 猫又おかゆ (hBP05-044) 青・1st・HP130（#ゲーマーズ）
 * ブルームエフェクト「お弁当タイム…？」:
 *   相手のセンターホロメンとバックホロメン1人に特殊ダメージ10を与える。
 *   自分のブルームエフェクト「お弁当タイム…？」はターンに1回しか使えない。
 * アーツ「ドンストップゲーミング！」(40): 相手のホロメン1人に特殊ダメージ10を与える。
 */
export default {
  number: 'hBP05-044',
  bloomEffect: {
    name: 'お弁当タイム…？',
    *run(ctx) {
      if (ctx.oncePerTurnUsed('hBP05-044:お弁当タイム')) {
        ctx.log('ブルームエフェクト「お弁当タイム…？」はこのターン既に使用済み');
        return;
      }
      ctx.markOncePerTurn('hBP05-044:お弁当タイム');
      // 相手センターに特殊10
      const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
      if (center) yield* ctx.dealSpecialDamage(center, 10);
      // 相手バック1人に特殊10
      const backs = ctx.holomems('opp', (e) => e.pos.zone === 'back');
      if (backs.length > 0) {
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.pos.zone === 'back',
          title: '特殊ダメージ10を与える相手のバックホロメンを選択',
        });
        if (target) yield* ctx.dealSpecialDamage(target, 10);
      }
    },
  },
  arts: {
    'ドンストップゲーミング！': {
      *run(ctx) {
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          title: '特殊ダメージ10を与える相手ホロメンを選択',
        });
        if (target) yield* ctx.dealSpecialDamage(target, 10);
      },
    },
  },
};
