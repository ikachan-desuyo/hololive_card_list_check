/**
 * 響咲リオナ (hBP06-018) 白・1st・HP160（#FLOW GLOW = FLOW+GLOW）
 * コラボエフェクト「FLOW GLOWのリーダー」:
 *   このターンの間、自分のステージの#FLOW GLOWを持つホロメン1人のアーツ+20。
 * アーツ「Brr! Brr!」(30): 自分のデッキの上から1枚をアーカイブする。
 */
const isFlowGlow = (ctx, top) => ctx.hasTag(top, 'FLOW') && ctx.hasTag(top, 'GLOW');

export default {
  number: 'hBP06-018',
  collabEffect: {
    name: 'FLOW GLOWのリーダー',
    *run(ctx) {
      const target = yield ctx.chooseHolomem({
        side: 'self', filter: (e) => isFlowGlow(ctx, e.top),
        title: 'このターン アーツ+20する #FLOW GLOW ホロメンを選択',
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
  arts: {
    'Brr! Brr!': {
      *run(ctx) {
        if (ctx.player.deck.length > 0) {
          const c = ctx.player.deck.shift();
          ctx.player.archive.push(c);
          ctx.log(`デッキの上から ${c.name} をアーカイブ`);
          ctx.recordDeckArchive(1);
        }
      },
    },
  },
};
