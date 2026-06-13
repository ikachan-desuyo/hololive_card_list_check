/**
 * アーニャ・メルフィッサ (hBP04-074) 黄・Debut・HP120（#ID,#ID2期生,#語学）
 * ギフト「A Day at the Café」: [センターポジション限定]このホロメンと自分のコラボホロメンが受けるダメージ-10。
 *   → 常時アウラ（auraDamageDelta）。自分(アーニャ)がセンターにいる間、
 *     このホロメン自身とその持ち主のコラボホロメンが受けるダメージを-10する。
 *     _auraSum は持ち主のステージのみ走査するので、対象は自然に「自分の」コラボに限定される。
 * アーツ「隣座りますか？」(20): テキスト効果なし。
 *
 * 保留: なし
 */
export default {
  number: 'hBP04-074',
  auraDamageDelta(src, target, zone, engine) {
    // [センターポジション限定] このホロメン(src)がセンターにいる時のみ有効
    if (engine._zoneOf(src) !== 'center') return 0;
    // このホロメン自身、または自分のコラボホロメンが受けるダメージ-10
    if (src === target) return -10;       // このホロメン（センター）
    return zone === 'collab' ? -10 : 0;   // 自分のコラボホロメン
  },
};
