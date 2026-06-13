/**
 * 風真いろは (hBP06-025) 緑・1st・HP150（#秘密結社holoX）
 * ギフト「のんびり過ごす記念日」:
 *   [センターポジション・コラボポジション限定]自分のステージのこのホロメン以外の
 *   #秘密結社holoXを持つホロメン全員のアーツ+20。
 *   → 常時アウラ（auraArtsPlus）。自分がセンター/コラボにいる間、自分以外の#holoX全員に+20。
 * アーツ「ツンツンツン…」(50): テキスト効果なし。
 */
export default {
  number: 'hBP06-025',
  auraArtsPlus(src, target, engine) {
    const z = engine._zoneOf(src);
    if (z !== 'center' && z !== 'collab') return 0;
    if (target === src) return 0; // このホロメン以外
    return (target.stack[0].tags || []).includes('秘密結社holoX') ? 20 : 0;
  },
};
