/**
 * 赤井はあと (hBP07-037) 赤・Debut・HP100（#JP #1期生 #料理）
 * コラボエフェクト「ちゃまと旅する！」:
 *   自分のセンターホロメンが〈赤井はあと〉なら、自分のデッキを1枚引く。
 * アーツ「旅はまだ、始まったばかり。」 dmg:20（特別な効果テキストなし）
 */
export default {
  number: 'hBP07-037',
  collabEffect: {
    name: 'ちゃまと旅する！',
    *run(ctx) {
      const center = ctx.player.center;
      const centerName = center?.stack?.[0]?.name;
      if (centerName === '赤井はあと') {
        ctx.draw(1);
      }
    },
  },
  // アーツ「旅はまだ、始まったばかり。」は通常ダメージのみのため定義不要。
};
