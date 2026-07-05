/**
 * 姫森ルーナ (hBP03-010) 白・Debut・HP80（#JP #4期生 #ベイビー）
 * コラボエフェクト「お菓子の国のお姫様」:
 *   自分のセンターホロメンが〈姫森ルーナ〉の時、自分のデッキを1枚引く。
 * アーツ「お菓子たべるのら？」(20): テキスト効果なし（ダメージのみ）。
 */
export default {
  number: 'hBP03-010',
  collabEffect: {
    name: 'お菓子の国のお姫様',
    *run(ctx) {
      const center = ctx.player.center;
      const centerName = center?.stack?.[0]?.name;
      if (centerName === '姫森ルーナ') {
        ctx.draw(1);
      }
    },
  },
};
