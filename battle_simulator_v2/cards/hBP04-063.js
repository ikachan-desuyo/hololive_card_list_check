/**
 * 古石ビジュー (hBP04-063) ホロメン
 * ギフト: 相手のターンで、このホロメンがダウンした時、自分のデッキを1枚引く。
 */
export default {
  number: 'hBP04-063',
  triggers: {
    *onDown(ctx) {
      if (ctx.state.turnPlayer === ctx.playerIdx) return; // 相手のターンのみ
      ctx.draw(1);
    },
  },
};
