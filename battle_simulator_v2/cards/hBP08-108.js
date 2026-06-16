/**
 * いたずらなRuffians (hBP08-108) サポート・ファン
 *
 * [サポート効果]
 *   ■このファンが付いているホロメンのHP+10。
 *     → attached.hpPlus（常時+10）。
 *   ◆相手のターンで、このファンが付いているホロメンがダウンした時、
 *     このファンが付いているホロメンに赤エールが付いているなら、自分のデッキを1枚引く。
 *     → triggers.onDown（相手ターン限定）。_processDown はアーカイブ前に発火するため、
 *        ダウンしたホロメン(=ctx.sourceHolomem)のエールはまだ付いている＝赤エール判定が可能。
 *
 * 付け先制限:
 *   このファンは、自分の〈フワワ・アビスガード〉か〈モココ・アビスガード〉だけに付けられ、1人につき何枚でも付けられる。
 *
 * ※「常時バフ＋トリガー」型はコンパイラが枠ごと不採用にするため手書きが必要。
 */
export default {
  number: 'hBP08-108',
  attachRule: {
    canAttach: (h) => h.stack[0].name === 'フワワ・アビスガード' || h.stack[0].name === 'モココ・アビスガード',
    unlimited: true, // 1人に何枚でも
  },
  attached: {
    hpPlus() { return 10; },
  },
  triggers: {
    *onDown(ctx) {
      if (ctx.state.turnPlayer === ctx.playerIdx) return;            // 相手のターンのみ
      const host = ctx.sourceHolomem;                               // ダウンした（このファンが付いていた）ホロメン
      if (!host.cheers.some((c) => c.color === '赤')) return;        // 赤エールが付いているなら
      ctx.draw(1);
    },
  },
};
