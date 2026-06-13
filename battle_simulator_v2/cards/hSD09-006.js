/**
 * 兎田ぺこら (hSD09-006) 緑・Debut・HP90（#JP #3期生 #ケモミミ #サマー）
 * コラボエフェクト「あんたたち働くぺこー！」:
 *   自分が後攻で最初のターンなら、自分のエールデッキの上から1枚を、
 *   自分の#3期生を持つホロメンに送る。
 * アーツ「ご注文のかき氷ぺこ！」(10): dmgのみ（追加効果なし）。
 */
export default {
  number: 'hSD09-006',
  collabEffect: {
    name: 'あんたたち働くぺこー！',
    *run(ctx) {
      if (!ctx.isFirstTurnGoingSecond()) return;
      if (ctx.player.cheerDeck.length === 0) return;
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.hasTag(e.top, '3期生'),
        title: 'エールデッキの上から1枚を送る #3期生 ホロメンを選択',
      });
      if (!target) return;
      ctx.sendCheerFromCheerDeckTop(target.holomem);
    },
  },
};
