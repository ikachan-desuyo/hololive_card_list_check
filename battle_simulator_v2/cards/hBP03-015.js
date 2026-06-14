/**
 * 轟はじめ (hBP03-015) 白・2nd・HP190（#DEV_IS #ReGLOSS #ベイビー）
 *
 * アーツ「これが番長の実力ってやつよ」(110+):
 *   自分の#ReGLOSSを持つバックホロメンが4人以上いる時、このホロメンのアーツ+40。
 *   → dmgBonus で実装。
 *
 * ギフト/キーワード「メランコリャック」: [センターポジション限定]自分の#ReGLOSSを持つ
 *   コラボホロメンが受けるダメージ-20。
 *   → auraDamageDelta（常時アウラ）で実装。はじめがセンターにいる間、#ReGLOSSのコラボの被ダメージ-20。
 */
export default {
  number: 'hBP03-015',
  // キーワード「メランコリャック」: [センター限定]自分の#ReGLOSSコラボが受けるダメージ-20（常時アウラ）
  auraDamageDelta(src, target, zone, engine) {
    if (engine._zoneOf(src) !== 'center') return 0;          // [センター限定]（はじめ自身）
    if (zone !== 'collab') return 0;                         // コラボホロメン
    if (!(target.stack[0].tags || []).includes('ReGLOSS')) return 0; // #ReGLOSS
    return -20;
  },
  arts: {
    'これが番長の実力ってやつよ': {
      dmgBonus(ctx) {
        const reglossBacks = ctx.holomems(
          'self',
          (e) => e.pos.zone === 'back' && ctx.hasTag(e.top, 'ReGLOSS'),
        ).length;
        return reglossBacks >= 4 ? 40 : 0;
      },
    },
  },
};
