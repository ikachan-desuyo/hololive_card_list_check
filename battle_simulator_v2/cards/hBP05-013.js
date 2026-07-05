/**
 * ときのそら (hBP05-013) 赤・2nd・HP210（#0期生,#歌）
 * ギフト「Ray of Jewelry」:
 *   [センターポジション・コラボポジション限定]自分のステージの#0期生を持つホロメン全員のアーツ+30。
 *   → 常時アウラ（auraArtsPlus）。自分(ときのそら)がセンター/コラボにいる間、#0期生全員（自分含む）に+30。
 * アーツ「7周年いえーい」(90): テキスト効果なし。
 */
export default {
  number: 'hBP05-013',
  auraArtsPlus(src, target, engine) {
    const z = engine._zoneOf(src);
    if (z !== 'center' && z !== 'collab') return 0;
    return (target.stack[0].tags || []).includes('0期生') ? 30 : 0;
  },
};
