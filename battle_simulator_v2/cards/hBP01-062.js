/**
 * 小鳥遊キアラ (hBP01-062) 赤・Debut・HP90（#EN #Myth #トリ）
 * アーツ「キッケリキー！」(20+):
 *   自分の手札1枚をアーカイブできる：このアーツ+20。
 */
export default {
  number: 'hBP01-062',
  arts: {
    'キッケリキー！': {
      *run(ctx) {
        if (ctx.player.hand.length === 0) return;
        const ok = yield ctx.confirm('手札1枚をアーカイブしてこのアーツ+20しますか？');
        if (!ok) return;
        const card = yield ctx.chooseCard({
          cards: ctx.player.hand,
          title: 'アーカイブする手札を選択',
        });
        if (!card) return;
        ctx.removeFromHand(card);
        ctx.player.archive.push(card);
        ctx.addArtBonus(20, '手札1枚をアーカイブ');
      },
    },
  },
};
