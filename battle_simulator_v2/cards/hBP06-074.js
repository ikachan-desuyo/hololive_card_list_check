/**
 * 夏色まつり (hBP06-074) 黄・1st・HP140（#JP #1期生 #シューター）
 * コラボエフェクト「天使界隈」:
 *   このターンに自分が使っていたサポートカード1枚につき、このターンの間、
 *   自分のセンターホロメンのアーツ+10。ただし、数える枚数は3枚まで。
 *   → 効果解決時点で「すでに使っていた」サポート枚数を数える（上限3枚）。
 *      対象は「自分のセンターホロメン」=効果解決時のセンターに対するターン修正
 *      （アーツ計算時にその時のセンターへ適用されるよう match でセンター判定）。
 * アーツ「CURE PALE」(30): 効果なし（実装不要）。
 */
export default {
  number: 'hBP06-074',
  collabEffect: {
    name: '天使界隈',
    *run(ctx) {
      // このターンに使ったサポートカードの枚数（全種カウント、上限3枚）
      const count = Math.min(3, ctx.countSupportThisTurn(() => true));
      if (count <= 0) return;
      const amount = count * 10;
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount,
        ownerIdx: ctx.playerIdx,
        match: (h) => ctx.engine._zoneOf(h) === 'center',
        description: `このターン、自分のセンターホロメンのアーツ+${amount}（サポート${count}枚）`,
      });
    },
  },
};
