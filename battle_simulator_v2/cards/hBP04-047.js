/**
 * 雪花ラミィ 1st (hBP04-047)
 * コラボエフェクト「fleur」:
 * 自分の〈雪民〉が付いている〈雪花ラミィ〉がいる時、相手のホロメン1人に特殊ダメージ20を与える。
 * ただし、ダウンしても相手のライフは減らない。
 */
export default {
  number: 'hBP04-047',
  collabEffect: {
    name: 'fleur',
    *run(ctx) {
      const ok = ctx.holomems('self', ({ top, holomem }) =>
        top.name === '雪花ラミィ' && holomem.attachments.some((a) => a.name === '雪民')).length > 0;
      if (!ok) {
        ctx.log('〈雪民〉が付いている〈雪花ラミィ〉がいないため発動しない');
        return;
      }
      const target = yield ctx.chooseHolomem({
        side: 'opp',
        title: '特殊ダメージ20を与える相手ホロメンを選択',
      });
      if (target) yield* ctx.dealSpecialDamage(target, 20, { noLifeOnDown: true });
    },
  },
};
