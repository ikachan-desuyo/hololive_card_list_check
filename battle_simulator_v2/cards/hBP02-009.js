/**
 * 白上フブキ (hBP02-009) 白・Debut・HP80（#JP,#1期生,#ゲーマーズ,#ケモミミ,#絵）
 * ギフト「おはこんきーつね！」:
 *   [コラボポジション限定]自分のマスコットが付いているホロメン全員のアーツ+10。
 *   → 常時アウラ（auraArtsPlus）。自分(フブキ)がコラボにいる間、
 *     マスコットが付いているホロメン全員（自分含む）に+10。
 * アーツ「おつこーんでしたー」(20): テキスト効果なし。
 */
export default {
  number: 'hBP02-009',
  auraArtsPlus(src, target, engine) {
    if (engine._zoneOf(src) !== 'collab') return 0;
    const hasMascot = (target.attachments || []).some((a) => a.supportType === 'マスコット');
    return hasMascot ? 10 : 0;
  },
};
