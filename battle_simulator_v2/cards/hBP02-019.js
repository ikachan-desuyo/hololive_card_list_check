/**
 * パヴォリア・レイネ Debut (hBP02-019)
 * コラボエフェクト「友達をHALUにさせる方法」:
 * 自分のアーカイブのエール1枚を自分のホロメンに送れる。
 */
export default {
  number: 'hBP02-019',
  collabEffect: {
    name: '友達をHALUにさせる方法',
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
};
