/**
 * えびふらいおん (hBP06-102) サポート・マスコット
 * このマスコットが付いているホロメンのHP+20。
 * ◆〈夏色まつり〉に付いていたら能力追加:
 *   相手のターンで、このマスコットが付いているホロメンがダウンした時、
 *   このホロメンの黄エール1枚を自分の他の〈夏色まつり〉に付け替えられる。
 */
export default {
  number: 'hBP06-102',
  attached: {
    hpPlus() { return 20; },
  },
  triggers: {
    *onDown(ctx) {
      if (ctx.state.turnPlayer === ctx.playerIdx) return; // 相手のターンのみ
      const h = ctx.sourceHolomem;
      if (!h || h.stack[0].name !== '夏色まつり') return;
      const yellows = h.cheers.filter((c) => c.color === '黄');
      const others = ctx.holomems('self', (e) => e.holomem !== h && e.top.name === '夏色まつり');
      if (yellows.length === 0 || others.length === 0) return;
      const cheer = yield ctx.chooseCard({
        cards: yellows, title: '付け替える黄エールを選択（任意）', optional: true, skipLabel: '付け替えない',
      });
      if (!cheer) return;
      const target = yield ctx.chooseHolomem({
        side: 'self', filter: (e) => e.holomem !== h && e.top.name === '夏色まつり',
        title: '付け替え先の〈夏色まつり〉を選択',
      });
      if (target) ctx.moveCheer(cheer, h, target.holomem);
    },
  },
};
