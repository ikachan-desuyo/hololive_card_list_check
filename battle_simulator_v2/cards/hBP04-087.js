/**
 * エリザベス・ローズ・ブラッドフレイム (hBP04-087) 無色・Spot・HP140（#EN,#Justice,#歌）
 * ギフト『緋色の女王』: [コラボポジション限定]自分のDebutホロメンがセンターポジションで受けるダメージ-20。
 *   → 常時アウラ（auraDamageDelta）。このホロメン(src)がコラボにいる間、
 *     自分のセンターにいるDebutホロメンが受けるダメージ-20。
 *     ダメージ種別（arts/special）は問わない。HP条件・回数制限なし。
 * アーツ「ERB」(20): テキスト効果なし。
 *
 * 保留: なし。
 */
export default {
  number: 'hBP04-087',
  auraDamageDelta(src, target, zone, engine) {
    if (engine._zoneOf(src) !== 'collab') return 0;      // [コラボポジション限定]
    if (zone !== 'center') return 0;                     // センターポジションで受ける
    if (target.stack[0]?.bloomLevel !== 'Debut') return 0; // Debutホロメンのみ
    return -20;
  },
};
