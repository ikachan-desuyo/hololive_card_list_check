/**
 * 大空スバル (hBP06-079) 黄・1st・HP140（#JP #2期生 #トリ）
 * コラボエフェクト「Subaru Duck Dance」:
 *   自分のアーカイブのエール1枚をこのホロメンに送れる。（任意）
 * アーツ「さ゛さ゛な゛み゛の゛音゛」(30): テキスト効果なし（dmgのみ）。
 */
export default {
  number: 'hBP06-079',
  collabEffect: {
    name: 'Subaru Duck Dance',
    *run(ctx) {
      const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
      if (cheers.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: cheers,
        title: 'このホロメンに送るエールをアーカイブから選択',
        optional: true,
        skipLabel: '送らない',
      });
      if (!picked) return;
      ctx.removeFromArchive(picked);
      ctx.attachCheer(picked, ctx.sourceHolomem);
    },
  },
};
