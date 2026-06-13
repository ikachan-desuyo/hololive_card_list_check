/**
 * 角巻わため (hBP03-068) 黄・Debut・HP90（#JP #4期生 #ケモミミ #歌）
 * アーツ「わためのうた」(20):
 *   自分の〈わためいと〉が付いているホロメンがいる時、
 *   自分のアーカイブのエール1枚を自分の黄ホロメンに送れる。
 *   → 条件: 自分のステージに〈わためいと〉が付いたホロメンがいること。
 *     「送れる」=任意。送り先は自分の黄色ホロメン限定。アーカイブのエールはどの色でも可。
 */
export default {
  number: 'hBP03-068',
  arts: {
    'わためのうた': {
      *run(ctx) {
        // 条件: 自分のステージに〈わためいと〉が付いているホロメンがいる
        const hasWatameito = ctx.holomems('self').some((e) =>
          e.holomem.attachments.some((a) => a.name === 'わためいと'));
        if (!hasWatameito) return;

        // アーカイブのエール
        const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
        if (cheers.length === 0) return;
        // 送り先候補: 自分の黄ホロメン
        if (ctx.holomems('self', (e) => e.top.color === '黄').length === 0) return;

        const picked = yield ctx.chooseCard({
          cards: cheers,
          title: 'アーカイブから黄ホロメンに送るエールを選択（任意）',
          optional: true,
          skipLabel: '送らない',
        });
        if (!picked) return;
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => e.top.color === '黄',
          title: 'エールを送る黄ホロメンを選択',
        });
        if (target) {
          ctx.removeFromArchive(picked);
          ctx.attachCheer(picked, target.holomem);
        }
      },
    },
  },
};
