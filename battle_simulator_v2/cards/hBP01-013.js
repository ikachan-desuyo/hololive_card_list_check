/**
 * 天音かなた (hBP01-013) 白・1st・HP100（#JP #4期生 #歌）
 * ブルームエフェクト「天使のお仕事」:
 *   相手のセンターホロメンに特殊ダメージ30を与える（ダウンしても相手のライフは減らない）。
 * アーツ「エンジェルステージ」(50): 効果なし（素のダメージのみ）。
 */
export default {
  number: 'hBP01-013',
  bloomEffect: {
    name: '天使のお仕事',
    *run(ctx) {
      const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
      if (!center) return;
      ctx.dealSpecialDamage(center, 30, { noLifeOnDown: true });
    },
  },
};
