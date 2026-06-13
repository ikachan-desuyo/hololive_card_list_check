/**
 * アイラニ・イオフィフティーン (hBP05-020) 緑・Debut・HP90（#ID1期生）
 * コラボエフェクト「過去・今・未来の私と君へ」:
 *   自分が後攻で最初のターンなら、自分のエールデッキの上から1枚を自分の#ID1期生を持つホロメンに送る。
 * アーツ「君となら」(10): テキスト効果なし。
 */
export default {
  number: 'hBP05-020',
  collabEffect: {
    name: '過去・今・未来の私と君へ',
    *run(ctx) {
      if (!ctx.isFirstTurnGoingSecond()) return;
      const targets = ctx.holomems('self', (e) => ctx.hasTag(e.top, 'ID1期生'));
      if (targets.length === 0) return;
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.hasTag(e.top, 'ID1期生'),
        title: 'エールデッキの上から1枚を送る #ID1期生 ホロメンを選択',
      });
      if (entry) ctx.sendCheerFromCheerDeckTop(entry.holomem);
    },
  },
};
