/**
 * 儒烏風亭らでん (hSD05-010) 緑・Debut・HP80（#DEV_IS #ReGLOSS #お酒）
 * アーツ「ちょいと一席」(dmg:20):
 *   自分のアーカイブのエール1枚を、自分の#ReGLOSSを持つホロメンに送れる。（任意）
 */
export default {
  number: 'hSD05-010',
  arts: {
    'ちょいと一席': {
      *run(ctx) {
        const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
        if (cheers.length === 0) return;
        // 送り先候補（#ReGLOSS を持つホロメン）が居なければ何もしない
        const targets = ctx.holomems('self', (e) => ctx.hasTag(e.top, 'ReGLOSS'));
        if (targets.length === 0) return;
        const picked = yield ctx.chooseCard({
          cards: cheers,
          title: 'アーカイブから送るエールを選択（任意）',
          optional: true,
          skipLabel: '送らない',
        });
        if (!picked) return;
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => ctx.hasTag(e.top, 'ReGLOSS'),
          title: 'エールを送る #ReGLOSS ホロメンを選択',
        });
        if (!target) return;
        ctx.removeFromArchive(picked);
        ctx.attachCheer(picked, target.holomem);
      },
    },
  },
};
