/**
 * 星街すいせい (hBP01-076) 青・Debut・HP90（#JP #0期生 #歌）
 * アーツ「スターの原石」(20):
 *   相手のバックホロメン1人に特殊ダメージ10を与える（ダウンしても相手のライフは減らない）。
 */
export default {
  number: 'hBP01-076',
  arts: {
    'スターの原石': {
      *run(ctx) {
        const backs = ctx.holomems('opp', (e) => e.pos.zone === 'back');
        if (backs.length === 0) return;
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.pos.zone === 'back',
          title: '特殊ダメージ10を与える相手のバックホロメンを選択',
        });
        if (target) ctx.dealSpecialDamage(target, 10, { noLifeOnDown: true });
      },
    },
  },
};
