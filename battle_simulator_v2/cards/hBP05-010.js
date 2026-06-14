/**
 * 白銀ノエル (hBP05-010) 白・1st・HP140（#JP, #3期生, #お酒）
 *
 * [キーワード/ギフト] 闘う団長:
 *   [コラボポジション限定]自分の#3期生を持つセンターホロメンがいる間、
 *   相手のホロメンのアーツは、自分のコラボホロメンしか対象にできない。
 *   ただし、特殊ダメージは除く。
 *   → oppArtsTargetRestrict で実装。このホロメンがコラボ位置で、自分の#3期生センターがいる間、
 *     相手のアーツ対象を自分のコラボに限定（['collab']を返す）。特殊ダメージは対象制限の対象外（別経路）。
 *
 * [アーツ] 生きる力 (20+):
 *   このターンに自分が〈牛丼〉を使っていたなら、このアーツ+30。 → 実装済み。
 */
export default {
  number: 'hBP05-010',
  arts: {
    '生きる力': {
      dmgBonus(ctx) {
        return ctx.usedSupportNamed('牛丼') ? 30 : 0;
      },
    },
  },
  // ギフト「闘う団長」: [コラボ限定]自分の#3期生センターがいる間、相手アーツは自分のコラボしか対象にできない
  oppArtsTargetRestrict(src, engine, defender) {
    if (engine._zoneOf(src) !== 'collab') return null;     // [コラボポジション限定]
    const center = defender.center;
    if (!center || !(center.stack[0].tags || []).includes('3期生')) return null;
    return ['collab'];
  },
};
