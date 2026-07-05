/**
 * Takodachi (hBP08-110) サポート・ファン
 *
 * [サポート効果]
 *   ■このファンが付いているホロメンのアーツ+10。
 *   ◆[センターポジション限定]相手のセンターホロメンとコラボホロメンは、
 *     すべての色を持つホロメンとして扱う。
 *   このファンは、自分の〈一伊那尓栖〉だけに付けられ、1人につき何枚でも付けられる。
 *
 * 実装:
 *   - アーツ+10 は attached.artsPlus。
 *   - 全色扱いは継続アウラ auraTreatedAllColors。付け先(=一伊那尓栖)がセンターにいる時、
 *     相手のセンター/コラボを全色扱いにする。engine._isTreatedAllColors がこのアウラを参照する。
 *     これにより、特攻や色条件の推しスキルがそれらのホロメンに対して成立する（Q686-689）。
 *     ※「すべての色」に無色は含まない（Q685）。engine._hasColor が無色を別扱いするため整合。
 *   - 付け先ルールは attachRule（〈一伊那尓栖〉のみ・何枚でも）。
 */
export default {
  number: 'hBP08-110',
  attachRule: {
    canAttach: (h) => h.stack[0].name === '一伊那尓栖',
    unlimited: true,
  },
  attached: {
    artsPlus() { return 10; },
  },
  // [センター限定] 付け先(一伊那尓栖)がセンターの時、相手のセンター/コラボを全色扱いにする
  auraTreatedAllColors(src, target, engine) {
    if (engine._zoneOf(src) !== 'center') return false; // [センターポジション限定]（付け先がセンター）
    const srcIdx = engine.state.players.findIndex((p) => engine._stageHolomems(p).includes(src));
    const tgtIdx = engine.state.players.findIndex((p) => engine._stageHolomems(p).includes(target));
    if (srcIdx < 0 || tgtIdx < 0 || tgtIdx === srcIdx) return false; // 相手のホロメンのみ
    const tz = engine._zoneOf(target);
    return tz === 'center' || tz === 'collab';
  },
};
