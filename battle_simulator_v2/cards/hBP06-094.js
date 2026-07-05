/**
 * ワークアウト (hBP06-094) サポート・イベント・LIMITED
 * このカードは、自分のコラボホロメンがいるか、相手のコラボホロメンがいない時にしか使えない。
 * このターンの間、自分のステージのホロメン1人のアーツ+20。そのホロメンがBuzzホロメンか2ndホロメンなら、
 * かわりに、そのホロメンのアーツ+50。
 * LIMITED：ターンに1枚しか使えない。
 */
export default {
  number: 'hBP06-094',
  support: {
    canUse(ctx) {
      return !!ctx.player.collab || !ctx.opponent.collab;
    },
    *run(ctx) {
      const target = yield ctx.chooseHolomem({ side: 'self', title: 'アーツを強化するホロメンを選択' });
      if (!target) return;
      const chosen = target.holomem;
      const top = chosen.stack[0];
      const amount = (top.buzz || top.bloomLevel === '2nd') ? 50 : 20;
      ctx.addTurnModifier({
        kind: 'artsPlus', amount, ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターン、${top.name} のアーツ+${amount}`,
      });
    },
  },
};
