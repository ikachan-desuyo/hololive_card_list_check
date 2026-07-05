/**
 * ミオファ (hBP02-101) サポート・ファン
 *
 * [サポート効果]
 *   相手のターンで、このファンが付いているホロメンがダウンした時、自分のデッキを1枚引く。
 *   → triggers.onDown（相手ターン限定）。
 *      _processDown は装着カード（ファン）の triggers.onDown も発火し、
 *      ctx.sourceHolomem = ダウンしたホロメン（=このファンが付いていた〈大神ミオ〉）。
 *      「相手のターンで」は ctx.state.turnPlayer を見て判定する。
 *
 * 付け先制限:
 *   このファンは、自分の〈大神ミオ〉だけに付けられ、1人につき何枚でも付けられる。
 *   → attachRule.canAttach（大神ミオのみ）＋ unlimited（何枚でも）。
 */
export default {
  number: 'hBP02-101',
  attachRule: {
    canAttach: (h) => h.stack[0].name === '大神ミオ',
    unlimited: true,
  },
  triggers: {
    *onDown(ctx) {
      if (ctx.state.turnPlayer === ctx.playerIdx) return; // 相手のターンのみ
      ctx.draw(1);
    },
  },
};
