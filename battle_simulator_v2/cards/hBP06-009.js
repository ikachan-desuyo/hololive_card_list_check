/**
 * ラオーラ・パンテーラ (hBP06-009) 白・Debut・HP110（#Justice,#絵）
 * ギフト「BIG PINK CAT」: [センターポジション限定]自分のコラボホロメンが受けるダメージ-10。
 *   → 常時アウラ（auraDamageDelta）。自分(ラオーラ)がセンターにいる間、自分のコラボが受けるダメージ-10。
 * アーツ「I see you!」(30): テキスト効果なし。
 */
export default {
  number: 'hBP06-009',
  auraDamageDelta(src, target, zone, engine) {
    if (engine._zoneOf(src) !== 'center') return 0;
    return zone === 'collab' ? -10 : 0;
  },
};
