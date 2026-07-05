/**
 * 天音かなた (hBP01-010) 白・Debut・HP60（#JP #4期生 #歌）
 * コラボエフェクト「お出かけ天使」:
 *   このターンの間、自分のセンターホロメンのアーツ+10。
 *   自分のセンターホロメンが#4期生を持つ時、さらに、自分のセンターホロメンのアーツ+20。
 * アーツ「行ってきまーす」(20): 効果なし（通常アーツ）。
 *
 * 実装メモ: 「センターホロメン」はターン中に入れ替わり得るため、固定ホロメンではなく
 * センターポジションに対するマッチで継続効果を付与し、加算量も都度センターの#4期生で判定する。
 */
export default {
  number: 'hBP01-010',
  collabEffect: {
    name: 'お出かけ天使',
    *run(ctx) {
      const ownerIdx = ctx.playerIdx;
      ctx.addTurnModifier({
        kind: 'artsPlus',
        ownerIdx,
        match: (h) => ctx.engine.state.players[ownerIdx].center === h,
        amount: (h) => {
          // センターホロメンへ +10、さらに #4期生 を持つなら +20（合計+30）
          let n = 10;
          const top = h.stack && h.stack[0];
          if (top && (top.tags || []).includes('4期生')) n += 20;
          return n;
        },
        description: 'このターン、自分のセンターホロメンのアーツ+10（#4期生ならさらに+20）',
      });
    },
  },
};
