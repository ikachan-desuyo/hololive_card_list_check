/**
 * 雪花ラミィ Debut (hBP04-043)
 * アーツ「こんらみ～」: 相手のホロメン1人に特殊ダメージ10を与える。
 * ただし、ダウンしても相手のライフは減らない。
 */
export default {
  number: 'hBP04-043',
  arts: {
    'こんらみ～': {
      *run(ctx) {
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          title: '特殊ダメージ10を与える相手ホロメンを選択',
        });
        if (target) ctx.dealSpecialDamage(target, 10, { noLifeOnDown: true });
      },
    },
  },
};
