/**
 * ロゼ隊 (hBP01-122) サポート・ファン
 *
 * [サポート効果]
 *   相手のターンで、このファンが付いているホロメンがダウンした時、
 *   自分のエールデッキの上から1枚を、自分の〈アキ・ローゼンタール〉に送る。
 *   → triggers.onDown（相手ターン限定）。
 *      _processDown は装着カード（ファン）の triggers.onDown も発火し、
 *      ctx.sourceHolomem = ダウンしたホロメン（=このファンが付いていたアキ・ローゼンタール）。
 *      アーカイブ前に発火するためエール送りが間に合う。
 *      送り先は「自分の〈アキ・ローゼンタール〉」。複数いる場合は選択、いなければ送り元へ。
 *
 * 付け先制限:
 *   このファンは、自分の〈アキ・ローゼンタール〉だけに付けられ、1人につき何枚でも付けられる。
 *   → attachRule.canAttach（アキ・ローゼンタールのみ）＋ unlimited（何枚でも）。
 */
export default {
  number: 'hBP01-122',
  attachRule: {
    canAttach: (h) => h.stack[0].name === 'アキ・ローゼンタール',
    unlimited: true,
  },
  triggers: {
    *onDown(ctx) {
      if (ctx.state.turnPlayer === ctx.playerIdx) return; // 相手のターンのみ
      if (ctx.player.cheerDeck.length === 0) return;
      // 送り先は自分の〈アキ・ローゼンタール〉。基本は付いていたホロメン自身（=ダウンしたアキ・ローゼンタール）。
      const akis = ctx.holomems('self', (e) => e.top.name === 'アキ・ローゼンタール');
      let target = null;
      if (akis.length === 0) {
        // ステージに他のアキ・ローゼンタールがいない（このファンが付いていた本人がダウン中）→ 送り元へ
        target = ctx.sourceHolomem;
      } else if (akis.length === 1) {
        target = akis[0].holomem;
      } else {
        const chosen = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => e.top.name === 'アキ・ローゼンタール',
          title: 'エールデッキの上から1枚を送る〈アキ・ローゼンタール〉を選択',
        });
        target = chosen ? chosen.holomem : akis[0].holomem;
      }
      if (target) ctx.sendCheerFromCheerDeckTop(target);
    },
  },
};
