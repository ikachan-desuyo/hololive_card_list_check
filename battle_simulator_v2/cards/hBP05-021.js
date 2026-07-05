/**
 * アイラニ・イオフィフティーン (hBP05-021) 緑・1st・HP140（#ID1期生）
 * ブルームエフェクト「Hello beb!」: 自分のアーカイブのエール1枚をこのホロメンに送れる。
 * アーツ「抹茶めっちゃ好き」(40): テキスト効果なし。
 */
export default {
  number: 'hBP05-021',
  bloomEffect: {
    name: 'Hello beb!',
    *run(ctx) {
      const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
      if (cheers.length === 0 || !ctx.sourceHolomem) return;
      const picked = yield ctx.chooseCard({
        cards: cheers,
        title: 'このホロメンに送るエールを選択（アーカイブ・任意）',
        optional: true,
        skipLabel: '送らない',
      });
      if (picked) {
        ctx.removeFromArchive(picked);
        ctx.attachCheer(picked, ctx.sourceHolomem);
      }
    },
  },
};
