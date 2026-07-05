/**
 * 星街すいせい (hBP05-037) 赤・2nd・HP210（#0期生,#歌）
 * アーツ「Non-Limit Boost」(50): このホロメンに赤エールと青エールが付いているなら、
 *   自分のアーカイブのエール2枚をこのホロメンに送れる。どちらか1色しか付いていないなら、1枚送れる。
 * アーツ「Shout in Crisis」(220): このホロメンのエールすべてをアーカイブする。
 */
export default {
  number: 'hBP05-037',
  arts: {
    'Non-Limit Boost': {
      *run(ctx) {
        const colors = new Set(ctx.sourceHolomem.cheers.map((c) => c.color));
        const hasRed = colors.has('赤'), hasBlue = colors.has('青');
        const max = (hasRed && hasBlue) ? 2 : (hasRed || hasBlue) ? 1 : 0;
        const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
        const picked = yield ctx.chooseCards({
          cards: cheers, min: 0, max,
          title: `このホロメンに送るエールを選択（最大${max}枚・任意）`,
        });
        for (const c of picked) {
          ctx.removeFromArchive(c);
          ctx.attachCheer(c, ctx.sourceHolomem);
        }
      },
    },
    'Shout in Crisis': {
      *run(ctx) {
        for (const cheer of [...ctx.sourceHolomem.cheers]) yield* ctx.archiveCheer(ctx.sourceHolomem, cheer);
      },
    },
  },
};
