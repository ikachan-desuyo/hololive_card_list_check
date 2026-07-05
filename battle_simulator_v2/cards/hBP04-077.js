/**
 * アーニャ・メルフィッサ (hBP04-077) ホロメン
 * ギフト: 相手のターンで、このホロメンがダウンした時、
 *   このホロメンを含め重なっているホロメンの中から1枚を手札に戻す。
 *   （戻した残りのカードはダウン処理でアーカイブされる）
 */
export default {
  number: 'hBP04-077',
  triggers: {
    *onDown(ctx) {
      if (ctx.state.turnPlayer === ctx.playerIdx) return; // 相手のターンのみ
      const h = ctx.sourceHolomem;
      if (!h || h.stack.length === 0) return;
      const card = yield ctx.chooseCard({
        cards: h.stack.slice(),
        title: '手札に戻すホロメンカードを選択',
      });
      if (!card) return;
      const i = h.stack.indexOf(card);
      if (i !== -1) {
        h.stack.splice(i, 1);
        ctx.player.hand.push(card);
        ctx.log(`${card.name} を手札に戻した`);
      }
    },
  },
};
