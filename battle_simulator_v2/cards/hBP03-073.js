/**
 * アユンダ・リス (hBP03-073) 黄・Debut・HP110（#ID #ID1期生 #ケモミミ #歌）
 * アーツ「こんリス」(20)
 * アーツ「ぷるぷる～」(60):
 *   このホロメンのエール1枚を、自分の〈戌神ころね〉に付け替えられる。（任意・対象がいなければ何もしない）
 */
export default {
  number: 'hBP03-073',
  arts: {
    'ぷるぷる～': {
      *run(ctx) {
        const cheers = ctx.sourceHolomem.cheers || [];
        if (cheers.length === 0) return;
        const targets = ctx.holomems('self', (e) => e.top.name === '戌神ころね');
        if (targets.length === 0) return;
        const cheer = yield ctx.chooseCard({
          cards: cheers,
          title: '〈戌神ころね〉に付け替えるエールを選択（任意）',
          optional: true,
          skipLabel: '付け替えない',
        });
        if (!cheer) return;
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => e.top.name === '戌神ころね',
          title: '付け替え先の〈戌神ころね〉を選択',
        });
        if (!target) return;
        ctx.moveCheer(cheer, ctx.sourceHolomem, target.holomem);
      },
    },
  },
};
