/**
 * 常闇トワ (hBP03-056) 紫・2nd・HP190（#JP #4期生 #歌 #シューター）
 * アーツ「私を縛る固定概念を壊せ」(30):
 *   相手のセンターホロメンかコラボホロメンに特殊ダメージ30を与える。
 * アーツ「Break your ×××」(80):
 *   相手のセンターホロメンかコラボホロメンどちらかに、自分の#歌を持つバックホロメン
 *   1人につき特殊ダメージ20を与える。ただし、数える人数は4人まで。
 *   → ダメージ量 = min(4, #歌 バックホロメン数) × 20
 */
export default {
  number: 'hBP03-056',
  arts: {
    '私を縛る固定概念を壊せ': {
      *run(ctx) {
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'collab',
          title: '特殊ダメージ30を与える相手ホロメンを選択（センターかコラボ）',
        });
        if (target) yield* ctx.dealSpecialDamage(target, 30);
      },
    },
    'Break your ×××': {
      *run(ctx) {
        // 自分の #歌 を持つバックホロメンを数える（最大4人）
        const utaBacks = ctx.holomems('self',
          (e) => e.pos.zone === 'back' && ctx.hasTag(e.top, '歌')).length;
        const counted = Math.min(4, utaBacks);
        const amount = counted * 20;
        if (amount <= 0) return; // バックに#歌がいなければダメージ0
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'collab',
          title: `特殊ダメージ${amount}を与える相手ホロメンを選択（センターかコラボ）`,
        });
        if (target) yield* ctx.dealSpecialDamage(target, amount);
      },
    },
  },
};
