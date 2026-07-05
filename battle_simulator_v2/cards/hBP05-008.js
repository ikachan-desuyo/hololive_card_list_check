/**
 * 白銀ノエル (hBP05-008) 白・Debut・HP100（#JP,#3期生,#お酒）
 * ギフト「まっするまっする」:
 *   [コラボポジション限定]自分の#3期生を持つDebutホロメンがセンターポジションで受けるダメージ-20。
 *   → 常時アウラ（auraDamageDelta）。このノエル自身がコラボにいる間、
 *     自分のセンターにいる #3期生 を持つ Debut ホロメンが受けるダメージを-20する。
 *     （src===target の自己ギフトも成立しうる：ノエルがコラボにいて、別のノエル等がセンターの場合）
 * アーツ「楽しく！」(20): テキスト効果なし（素のダメージのみ）。
 *
 * 保留: なし
 */
export default {
  number: 'hBP05-008',
  auraDamageDelta(src, target, zone, engine) {
    // [コラボポジション限定] 発生源（ノエル）がコラボにいる時のみ有効
    if (engine._zoneOf(src) !== 'collab') return 0;
    // 軽減対象は「センターにいる #3期生 を持つ Debut ホロメン」
    if (zone !== 'center') return 0;
    const top = target.stack[0];
    if (!top) return 0;
    if (top.bloomLevel !== 'Debut') return 0;
    if (!(top.tags || []).includes('3期生')) return 0;
    return -20;
  },
};
