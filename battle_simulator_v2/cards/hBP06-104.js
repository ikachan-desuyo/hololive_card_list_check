/**
 * スバ友 (hBP06-104) サポート・ファン
 * 相手のターンで、このファンが付いているホロメンがダウンした時、
 *   自分のエールデッキの上から1枚を自分の〈大空スバル〉に送れる。
 * このファンは、自分の〈大空スバル〉だけに付けられ、1人につき何枚でも付けられる。
 */
export default {
  number: 'hBP06-104',
  attachRule: {
    canAttach(holomem) { return holomem.stack[0].name === '大空スバル'; },
    unlimited: true,
  },
  triggers: {
    *onDown(ctx) {
      if (ctx.state.turnPlayer === ctx.playerIdx) return; // 相手のターンのみ
      if (ctx.player.cheerDeck.length === 0) return;
      // ダウンするこのホロメン自身を除いた〈大空スバル〉に送る
      const subarus = ctx.holomems('self', (e) => e.holomem !== ctx.sourceHolomem && e.top.name === '大空スバル');
      if (subarus.length === 0) return;
      const entry = yield ctx.chooseHolomem({
        side: 'self', filter: (e) => e.holomem !== ctx.sourceHolomem && e.top.name === '大空スバル',
        title: 'エールデッキの上から1枚を送る〈大空スバル〉を選択', optional: true,
      });
      if (entry) ctx.sendCheerFromCheerDeckTop(entry.holomem);
    },
  },
};
