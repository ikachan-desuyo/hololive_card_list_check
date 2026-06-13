/**
 * 大空スバル (hBP04-070) 黄
 * コラボエフェクト「全力で頑張るから」:
 *   自分のホロメン1人を選ぶ。このターンの間、選んだホロメンのエール1枚につき、
 *   選んだホロメンのアーツ+10。ただし、数える枚数は3枚まで。
 *   （コラボ解決時のエール枚数でボーナス量を確定する）
 * （アーツ「いっぱい応援して、楽しんでね！」はテキスト効果なし）
 */
export default {
  number: 'hBP04-070',
  collabEffect: {
    name: '全力で頑張るから',
    *run(ctx) {
      const target = yield ctx.chooseHolomem({ side: 'self', title: 'アーツを強化するホロメンを選択' });
      if (!target) return;
      const chosen = target.holomem;
      const bonus = Math.min(chosen.cheers.length, 3) * 10;
      if (bonus <= 0) return;
      ctx.addTurnModifier({
        kind: 'artsPlus', amount: bonus, ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターンの間、${chosen.stack[0].name} のアーツ+${bonus}`,
      });
    },
  },
};
