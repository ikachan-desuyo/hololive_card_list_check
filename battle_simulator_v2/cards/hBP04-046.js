/**
 * 雪花ラミィ 1st (hBP04-046)
 * アーツ「いっぱい頑張るよ！」:
 * 自分のファンが付いているホロメンがいる時、相手のホロメン1人に特殊ダメージ10を与える。
 */
export default {
  number: 'hBP04-046',
  arts: {
    'いっぱい頑張るよ！': {
      *run(ctx) {
        const hasFan = ctx.holomems('self', ({ holomem }) =>
          holomem.attachments.some((a) => a.supportType === 'ファン')).length > 0;
        if (!hasFan) return;
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          title: '特殊ダメージ10を与える相手ホロメンを選択',
        });
        if (target) yield* ctx.dealSpecialDamage(target, 10);
      },
    },
  },
};
