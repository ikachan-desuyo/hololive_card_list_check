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
        for (let i = 0; i < max; i++) {
          const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
          if (cheers.length === 0) break;
          const picked = yield ctx.chooseCard({
            cards: cheers, title: `このホロメンに送るエールを選択（${i + 1}/${max}・任意）`,
            optional: true, skipLabel: '送らない',
          });
          if (!picked) break;
          ctx.removeFromArchive(picked);
          ctx.attachCheer(picked, ctx.sourceHolomem);
        }
      },
    },
    'Shout in Crisis': {
      *run(ctx) {
        for (const cheer of [...ctx.sourceHolomem.cheers]) ctx.archiveCheer(ctx.sourceHolomem, cheer);
      },
    },
  },
};
