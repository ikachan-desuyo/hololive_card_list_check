/**
 * AZKi（推しホロメン hSD01-002）
 * SP推しスキル「右手にマイク」[ホロパワー：-3][ゲームに1回]:
 *   自分のアーカイブのエールを自分の緑ホロメン1人に好きな枚数送る。
 * ※推しスキル「左手に地図」（サイコロの目の宣言＝タイミング系置換効果）は未対応
 */
export default {
  number: 'hSD01-002',
  spOshiSkill: {
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.top.color === '緑',
        title: 'エールを送る緑ホロメンを選択',
      });
      if (!entry) return;
      while (true) {
        const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
        if (cheers.length === 0) break;
        const picked = yield ctx.chooseCard({
          cards: cheers,
          title: 'アーカイブから送るエールを選択（好きな枚数）',
          optional: true,
          skipLabel: '終了する',
        });
        if (!picked) break;
        ctx.removeFromArchive(picked);
        ctx.attachCheer(picked, entry.holomem);
      }
    },
  },
};
