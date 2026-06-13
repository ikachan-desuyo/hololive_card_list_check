/**
 * ジジ・ムリン (hBP04-088) ホロメン
 * ギフト: 相手のターンで、このホロメンがダウンした時、
 *   自分のエールデッキの上から1枚を自分のホロメンに送る。
 */
export default {
  number: 'hBP04-088',
  triggers: {
    *onDown(ctx) {
      if (ctx.state.turnPlayer === ctx.playerIdx) return; // 相手のターンのみ
      // ダウンするこのホロメン自身を除いた、送り先になれるホロメン
      const targets = ctx.holomems('self', (e) => e.holomem !== ctx.sourceHolomem);
      if (targets.length === 0 || ctx.player.cheerDeck.length === 0) return;
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.holomem !== ctx.sourceHolomem,
        title: 'エールデッキの上から1枚を送るホロメンを選択',
      });
      if (entry) ctx.sendCheerFromCheerDeckTop(entry.holomem);
    },
  },
};
