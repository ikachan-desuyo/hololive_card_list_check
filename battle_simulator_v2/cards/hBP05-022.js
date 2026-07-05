/**
 * アイラニ・イオフィフティーン (hBP05-022) 緑・1st・HP150（#ID1期生）
 * キーワード「落日に染まる」(ブルームエフェクト):
 *   自分のステージにエールが4枚以上あるなら、このターンの間、
 *   自分のステージの#ID1期生を持つホロメン1人のアーツ+20。
 * アーツ「Matahari Terbenam」(50): テキスト効果なし。
 */
export default {
  number: 'hBP05-022',
  bloomEffect: {
    name: '落日に染まる',
    *run(ctx) {
      let total = 0;
      for (const e of ctx.holomems('self')) total += e.holomem.cheers.length;
      if (total < 4) return;
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.hasTag(e.top, 'ID1期生'),
        title: 'このターン アーツ+20する #ID1期生 ホロメンを選択',
      });
      if (!target) return;
      const chosen = target.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus', amount: 20, ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターン、${chosen.stack[0].name} のアーツ+20`,
      });
    },
  },
};
