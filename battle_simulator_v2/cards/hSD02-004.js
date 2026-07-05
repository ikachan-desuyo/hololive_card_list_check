/**
 * 百鬼あやめ (hSD02-004) 赤・Debut・HP60（#JP #2期生 #シューター）
 * コラボエフェクト「あやめのひととせ」:
 *   このホロメンに〈ぽよ余〉が付いている時、このターンの間、自分のセンターホロメンのアーツ+20。
 * アーツ「おだんごおいしい余」(30): 効果なし（素のダメージのみ）。
 */
export default {
  number: 'hSD02-004',
  collabEffect: {
    name: 'あやめのひととせ',
    *run(ctx) {
      const hasPoyoyo = ctx.sourceHolomem.attachments.some((a) => a.name === 'ぽよ余');
      if (!hasPoyoyo) return;
      const ownerIdx = ctx.playerIdx;
      ctx.addTurnModifier({
        kind: 'artsPlus', amount: 20, ownerIdx,
        match: (h) => ctx.engine.state.players[ownerIdx].center === h,
        description: 'このターン、自分のセンターホロメンのアーツ+20',
      });
    },
  },
};
