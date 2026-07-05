/**
 * 牛丼 (hBP05-075) サポート・イベント（#食べ物）
 * 自分のホロメン1人を選ぶ。このターンの間、選んだホロメンのバトンタッチに必要な無色エール-2。
 * その後、選んだホロメンのHP20回復。
 */
export default {
  number: 'hBP05-075',
  support: {
    *run(ctx) {
      const target = yield ctx.chooseHolomem({ side: 'self', title: 'バトンタッチ無色-2＋HP20回復するホロメンを選択' });
      if (!target) return;
      const chosen = target.holomem;
      ctx.addTurnModifier({
        kind: 'batonCostReduce', color: '無色', amount: 2, ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターン、${chosen.stack[0].name} のバトンタッチ必要無色-2`,
      });
      ctx.heal(chosen, 20);
    },
  },
};
