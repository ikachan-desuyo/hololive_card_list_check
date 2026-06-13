/**
 * ラプラス・ダークネス (hBP07-072) 紫・1st・HP150（#秘密結社holoX, #シューター）
 * ブルームエフェクト「Secret Love -La+-」:
 *   自分のステージの#秘密結社holoXを持つホロメン1人を選び、サイコロを3回振る。
 *   このターンの間、この能力で奇数が出た回数1回につき、選んだホロメンのアーツ+10。
 * アーツ「吾輩との秘密だぞ」(60): テキスト効果なし（コンパイラに任せる）。
 */
export default {
  number: 'hBP07-072',
  bloomEffect: {
    name: 'Secret Love -La+-',
    *run(ctx) {
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.hasTag(e.top, '秘密結社holoX'),
        title: 'アーツ+10する #秘密結社holoX ホロメンを選択',
      });
      if (!target) return;
      const chosen = target.holomem;
      let odd = 0;
      for (let i = 0; i < 3; i++) {
        const v = (yield* ctx.rollDice());
        if (v % 2 === 1) odd++;
      }
      if (odd === 0) return;
      const amount = odd * 10;
      ctx.addTurnModifier({
        kind: 'artsPlus', amount, ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターン、${chosen.stack[0].name} のアーツ+${amount}（奇数${odd}回）`,
      });
    },
  },
};
