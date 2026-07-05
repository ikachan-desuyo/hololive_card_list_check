/**
 * 白銀ノエル (hSD07-010) 白・Debut・HP70（#JP #3期生 #お酒）
 * コラボエフェクト「大物の確証」:
 *   このターンの間、自分のセンターホロメンのアーツ+10。
 * アーツ「いっぱい建築したいです」(20): 効果なし（通常アーツ）。
 *
 * 実装メモ: 「センターホロメン」はターン中に入れ替わり得るため、固定ホロメンではなく
 * センターポジションに対するマッチで継続効果を付与する（cf. hBP01-010）。
 */
export default {
  number: 'hSD07-010',
  collabEffect: {
    name: '大物の確証',
    *run(ctx) {
      const ownerIdx = ctx.playerIdx;
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 10,
        ownerIdx,
        match: (h) => ctx.engine.state.players[ownerIdx].center === h,
        description: 'このターン、自分のセンターホロメンのアーツ+10',
      });
    },
  },
};
