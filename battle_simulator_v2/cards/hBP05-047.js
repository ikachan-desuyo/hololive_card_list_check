/**
 * こぼ・かなえる (hBP05-047) 青・Debut・HP110（#ID3期生）
 * アーツ「アットユアサービス！」(20): 相手のバックホロメン1人に特殊ダメージ10を与える。
 */
export default {
  number: 'hBP05-047',
  arts: {
    'アットユアサービス！': {
      *run(ctx) {
        const backs = ctx.holomems('opp', (e) => e.pos.zone === 'back');
        if (backs.length === 0) return;
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.pos.zone === 'back',
          title: '特殊ダメージ10を与える相手のバックホロメンを選択',
        });
        if (target) yield* ctx.dealSpecialDamage(target, 10);
      },
    },
  },
};
