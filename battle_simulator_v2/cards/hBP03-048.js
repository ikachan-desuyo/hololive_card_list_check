/**
 * 火威青 (hBP03-048) 青・1st・HP130（#DEV_IS #ReGLOSS #絵）
 * アーツ「僕、カッコいいでしょ？」(30): 効果なし。
 * アーツ「ReGLOSSのボーイッシュ担当」(40):
 *   このホロメンのエール1枚を、自分の#ReGLOSSを持つバックホロメンに付け替えられる。（任意）
 */
export default {
  number: 'hBP03-048',
  arts: {
    'ReGLOSSのボーイッシュ担当': {
      *run(ctx) {
        const h = ctx.sourceHolomem;
        if (!h || h.cheers.length === 0) return;
        const backs = ctx.holomems('self', (e) => e.pos.zone === 'back' && ctx.hasTag(e.top, 'ReGLOSS'));
        if (backs.length === 0) return;
        const cheer = yield ctx.chooseCard({
          cards: h.cheers,
          title: '付け替えるエールを選択（任意）',
          optional: true,
          skipLabel: '付け替えない',
        });
        if (!cheer) return;
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => e.pos.zone === 'back' && ctx.hasTag(e.top, 'ReGLOSS'),
          title: '付け替え先の #ReGLOSS バックホロメンを選択',
        });
        if (target) ctx.moveCheer(cheer, h, target.holomem);
      },
    },
  },
};
