/**
 * 古石ビジュー (hSD12-008) 紫・Debut・HP110（#EN #Advent #ベイビー）
 * コラボエフェクト「花売りの少女」:
 *   自分が後攻で最初のターンなら、お互いのステージのエール1枚につき、自分のデッキを1枚引く。
 *   → isFirstTurnGoingSecond() で条件判定し、両ステージの全ホロメンに付いたエール総数を数えてドロー。
 * アーツ「私……この頃よく夢を見るの。」(30): テキスト効果なし（素点のみ）。
 */
export default {
  number: 'hSD12-008',
  collabEffect: {
    name: '花売りの少女',
    *run(ctx) {
      if (!ctx.isFirstTurnGoingSecond()) return; // 後攻で最初のターンのみ
      let cheerCount = 0;
      for (const { holomem } of ctx.holomems('self')) cheerCount += holomem.cheers.length;
      for (const { holomem } of ctx.holomems('opp')) cheerCount += holomem.cheers.length;
      if (cheerCount > 0) ctx.draw(cheerCount);
    },
  },
};
