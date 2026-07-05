/**
 * パヴォリア・レイネ 1st (hBP02-021)
 * ブルームエフェクト「心を込めて歌って、踊ります。」:
 *   自分のステージのエール1色につき、自分のホロメン1人のHP10回復。
 * アーツ「だから見ててね！大好き！」:
 *   自分のアーカイブのエール1枚を自分のホロメンに送れる。
 */
export default {
  number: 'hBP02-021',
  bloomEffect: {
    name: '心を込めて歌って、踊ります。',
    *run(ctx) {
      const colors = ctx.ownStageCheerColors();
      if (colors.length === 0) return;
      const amount = colors.length * 10;
      const target = yield ctx.chooseHolomem({
        side: 'self',
        title: `HPを${amount}回復するホロメンを選択（エール${colors.length}色）`,
      });
      if (target) ctx.heal(target.holomem, amount);
    },
  },
  arts: {
    'だから見ててね！大好き！': {
      *run(ctx) {
        const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
        if (cheers.length === 0) return;
        const picked = yield ctx.chooseCard({
          cards: cheers,
          title: 'アーカイブから送るエールを選択（任意）',
          optional: true,
          skipLabel: '送らない',
        });
        if (!picked) return;
        const target = yield ctx.chooseHolomem({
          side: 'self',
          title: 'エールを送るホロメンを選択',
        });
        if (target) {
          ctx.removeFromArchive(picked);
          ctx.attachCheer(picked, target.holomem);
        }
      },
    },
  },
};
