/**
 * 角巻わため (hBP07-008)
 * コラボエフェクト「もういっぺぇ」: 自分が後攻で最初のターンなら、自分の〈角巻わため〉1人を選ぶ。
 *   このターンの間、選んだホロメンはアーツを使った後、同じアーツをもう1回使える。
 *   → 選んだホロメンに kind:'reArts' のターン修正を付与（engine が再アーツのアクションを提示。1回限り）。
 * アーツ「スプリングシープ」: テキスト効果なし。
 */
export default {
  number: 'hBP07-008',
  collabEffect: {
    name: 'もういっぺぇ',
    *run(ctx) {
      if (!ctx.isFirstTurnGoingSecond()) return;
      const watame = ctx.holomems('self', (e) => ctx.nameIs(e.top, '角巻わため'));
      if (watame.length === 0) return;
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.nameIs(e.top, '角巻わため'),
        title: 'アーツをもう1回使える〈角巻わため〉を選択',
      });
      if (!entry) return;
      const selected = entry.holomem;
      ctx.addTurnModifier({
        kind: 'reArts',
        ownerIdx: ctx.playerIdx,
        used: false,
        match: (hm) => hm === selected,
        description: `${entry.top.name}はアーツを使った後もう1回同じアーツを使える`,
      });
    },
  },
};
