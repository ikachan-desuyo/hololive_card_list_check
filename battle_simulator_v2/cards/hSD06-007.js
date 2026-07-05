/**
 * 風真いろは (hSD06-007) 緑・2nd・HP180（#秘密結社holoX）
 * ブルームエフェクト「元気をお届け」:
 *   自分の#秘密結社holoXを持つホロメン1人のHP30回復。
 * アーツ「天才では？」(70+):
 *   自分のステージにエールが5枚以上ある時、このアーツ+50。
 */
export default {
  number: 'hSD06-007',
  bloomEffect: {
    name: '元気をお届け',
    *run(ctx) {
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.hasTag(e.top, '秘密結社holoX'),
        title: 'HP30回復する #秘密結社holoX ホロメンを選択',
      });
      if (target) ctx.heal(target.holomem, 30);
    },
  },
  arts: {
    '天才では？': {
      dmgBonus(ctx) {
        // 自分のステージ上のホロメンに付いているエールの総数が5枚以上
        const total = ctx.holomems('self')
          .reduce((sum, { holomem }) => sum + holomem.cheers.length, 0);
        return total >= 5 ? 50 : 0;
      },
    },
  },
};
