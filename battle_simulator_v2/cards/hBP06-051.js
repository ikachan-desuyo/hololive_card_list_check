/**
 * ムーナ・ホシノヴァ (hBP06-051) 青・1st・HP170（#ID #ID1期生 #歌）
 * アーツ「スプリングパーティー」(30): 効果なし
 * アーツ「親愛の情」(50):
 *   自分の推しホロメンが〈ムーナ・ホシノヴァ〉なら、
 *   このホロメンのエール1枚をアーカイブできる：自分のデッキを1枚引く。
 */
export default {
  number: 'hBP06-051',
  arts: {
    '親愛の情': {
      *run(ctx) {
        if (ctx.player.oshi?.name !== 'ムーナ・ホシノヴァ') return;
        if (ctx.sourceHolomem.cheers.length === 0) return;
        const ok = yield ctx.confirm('このホロメンのエール1枚をアーカイブしてデッキを1枚引きますか？');
        if (!ok) return;
        const cheer = yield ctx.chooseCard({
          cards: ctx.sourceHolomem.cheers,
          title: 'アーカイブするエールを選択',
        });
        if (!cheer) return;
        yield* ctx.archiveCheer(ctx.sourceHolomem, cheer);
        ctx.draw(1);
      },
    },
  },
};
