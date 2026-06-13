/**
 * 大空スバル (hBP04-070) 黄
 * コラボエフェクト「全力で頑張るから」:
 *   自分のホロメン1人を選ぶ。このターンの間、選んだホロメンのエール1枚につき、
 *   選んだホロメンのアーツ+10。ただし、数える枚数は3枚まで。
 *   （継続効果なので、アーツ解決時のエール枚数で毎回再評価する）
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
      ctx.addTurnModifier({
        kind: 'artsPlus',
        // 「エール1枚につき+10（最大3枚）」を解決時のエール数で再計算（コラボ後の増減に追従）
        amount: (h) => Math.min(h.cheers.length, 3) * 10,
        ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターンの間、${chosen.stack[0].name} のエール数(最大3)×10 アーツ強化`,
      });
    },
  },
};
