/**
 * Jailbird (hBP05-087) サポート・ファン
 * 相手のターンで、このファンが付いているホロメンがダウンした時、
 *   このホロメンのエール1枚を、自分の他の#歌を持つホロメンに付け替えられる。
 * このファンは、自分の〈ネリッサ・レイヴンクロフト〉だけに付けられ、1人につき何枚でも付けられる。
 */
export default {
  number: 'hBP05-087',
  attachRule: {
    canAttach(holomem) {
      return holomem.stack[0].name === 'ネリッサ・レイヴンクロフト';
    },
    unlimited: true,
  },
  triggers: {
    // ファンが付いているホロメンのダウン時トリガー（ダウンしたホロメンの number で発火するのは
    // ホロメン側だが、本効果はファンの能力。ファンの onAttach 同様、ダウンするホロメンに
    // このファンが付いている前提で記述）
    *onDown(ctx) {
      if (ctx.state.turnPlayer === ctx.playerIdx) return; // 相手のターンのみ
      const h = ctx.sourceHolomem;
      if (!h || h.cheers.length === 0) return;
      const others = ctx.holomems('self', (e) => e.holomem !== h && ctx.hasTag(e.top, '歌'));
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
        filter: (e) => e.holomem !== h && ctx.hasTag(e.top, '歌'),
        title: '付け替え先の #歌 ホロメンを選択',
      });
      if (target) ctx.moveCheer(cheer, h, target.holomem);
    },
  },
};
