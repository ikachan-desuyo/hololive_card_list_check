/**
 * しめじダンス (hBP06-087) サポート・イベント
 * このカードは、自分の推しホロメンが〈儒烏風亭らでん〉でなければ使えない。
 * 自分のエールデッキの上から1枚をアーカイブする。その後、自分のアーカイブの〈儒烏風亭らでん〉1枚を手札に戻す。
 */
export default {
  number: 'hBP06-087',
  support: {
    canUse(ctx) {
      return ctx.player.oshi?.name === '儒烏風亭らでん';
    },
    *run(ctx) {
      // エールデッキの上から1枚をアーカイブ
      if (ctx.player.cheerDeck.length > 0) {
        const cheer = ctx.player.cheerDeck.shift();
        ctx.player.archive.push(cheer);
        ctx.log(`エールデッキの上から ${cheer.name} をアーカイブ`);
      }
      // 「手札に戻す」＝強制（アーカイブは公開領域なので候補があれば必ず戻す）
      const radens = ctx.player.archive.filter((c) => c.kind === 'holomen' && ctx.nameIs(c, '儒烏風亭らでん'));
      if (radens.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: radens,
        title: '手札に戻す〈儒烏風亭らでん〉を選択',
      });
      if (picked) {
        ctx.removeFromArchive(picked);
        ctx.addToHand(picked, { reveal: false });
      }
    },
  },
};
