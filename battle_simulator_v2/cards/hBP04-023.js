/**
 * 儒烏風亭らでん (hBP04-023) ホロメン
 * ギフト: 相手のターンで、このホロメンがダウンした時、
 *   このホロメンのエール1枚を、自分の他の#ReGLOSSを持つホロメンに付け替えられる。
 */
export default {
  number: 'hBP04-023',
  triggers: {
    *onDown(ctx) {
      if (ctx.state.turnPlayer === ctx.playerIdx) return; // 相手のターンのみ
      const h = ctx.sourceHolomem;
      if (!h || h.cheers.length === 0) return;
      const others = ctx.holomems('self', (e) => e.holomem !== h && ctx.hasTag(e.top, 'ReGLOSS'));
      if (others.length === 0) return;
      const cheer = yield ctx.chooseCard({
        cards: h.cheers,
        title: '付け替えるエールを選択（任意）',
        optional: true,
        skipLabel: '付け替えない',
      });
      if (!cheer) return;
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.holomem !== h && ctx.hasTag(e.top, 'ReGLOSS'),
        title: '付け替え先の #ReGLOSS ホロメンを選択',
      });
      if (target) ctx.moveCheer(cheer, h, target.holomem);
    },
  },
};
