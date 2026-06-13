/**
 * ゆび (hBP06-099) サポート・ツール
 * このツールが付いているホロメンのアーツ+10。
 * このツールを手札から〈戌神ころね〉に付けた時、自分のアーカイブの〈戌神ころね〉1枚を手札に戻せる。
 * ツールは、自分のホロメン1人につき1枚だけ付けられる。
 */
export default {
  number: 'hBP06-099',
  attached: {
    artsPlus() { return 10; },
  },
  triggers: {
    *onAttach(ctx) {
      if (ctx.sourceHolomem.stack[0].name !== '戌神ころね') return;
      const korones = ctx.player.archive.filter((c) => c.kind === 'holomen' && c.name === '戌神ころね');
      if (korones.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: korones, title: '手札に戻す〈戌神ころね〉を選択（任意）', optional: true, skipLabel: '戻さない',
      });
      if (picked) { ctx.removeFromArchive(picked); ctx.addToHand(picked, { reveal: false }); }
    },
  },
};
