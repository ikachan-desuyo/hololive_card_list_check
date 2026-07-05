/**
 * 水宮枢 (hBP08-049) 青・1st・HP140（#DEV_IS, #FLOW, #GLOW）
 *
 * [キーワード/ギフト] 君との電話ひとりじめ:
 *   [コラボポジション限定]自分の#FLOW GLOWを持つセンターホロメンがいるなら、
 *   相手のホロメンのアーツは、自分のコラボホロメンしか対象にできない。
 *   ただし、特殊ダメージは除く。
 *   → oppArtsTargetRestrict で実装。このホロメンがコラボ位置で、自分の#FLOW GLOW（両タグ）センターが
 *     いる間、相手のアーツ対象を自分のコラボに限定（['collab']を返す）。特殊ダメージは対象制限外（別経路）。
 *
 * [アーツ] 君さえよかったらもっとはなそ (50):
 *   テキスト効果なし（素点50ダメージのみ）。エンジンが汎用処理するため run は不要。
 */
export default {
  number: 'hBP08-049',
  // ギフト「君との電話ひとりじめ」: [コラボ限定]自分の#FLOW GLOWセンターがいる間、相手アーツは自分のコラボしか対象にできない
  oppArtsTargetRestrict(src, engine, defender) {
    if (engine._zoneOf(src) !== 'collab') return null;     // [コラボポジション限定]
    const center = defender.center;
    if (!center) return null;
    const tags = center.stack[0].tags || [];
    if (!tags.includes('FLOW') || !tags.includes('GLOW')) return null;
    return ['collab'];
  },
};
