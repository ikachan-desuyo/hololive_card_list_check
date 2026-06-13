/**
 * エリザベス・ローズ・ブラッドフレイム (hSD13-005) 赤・1st（#Justice）
 * ギフト「For Justice! -ERB-」: 相手のターンで、自分の#Justiceを持つホロメンがダウンした時、
 *   自分のエールデッキの上から1枚をこのホロメンに送る。ターンに1回しか使えない。
 *   → triggers.onAnyDown（#Justiceのダウンを監視・ターン1回）
 * アーツ「Lovely to See You, to See You, Lovely～♡」(50): テキスト効果なし。
 */
export default {
  number: 'hSD13-005',
  triggers: {
    *onAnyDown(ctx) {
      if (ctx.state.turnPlayer === ctx.playerIdx) return;            // 相手のターン
      if (ctx.downedInfo?.ownerIdx !== ctx.playerIdx) return;        // 自分のホロメン
      if (!(ctx.downedInfo.card.tags || []).includes('Justice')) return; // #Justice
      if (ctx.oncePerTurnUsed('hSD13-005:ERB')) return;
      ctx.markOncePerTurn('hSD13-005:ERB');
      if (ctx.sourceHolomem) ctx.sendCheerFromCheerDeckTop(ctx.sourceHolomem);
    },
  },
};
