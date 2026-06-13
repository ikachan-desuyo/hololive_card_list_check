/**
 * 轟はじめ (hBP03-015) 白・2nd・HP190（#DEV_IS #ReGLOSS #ベイビー）
 *
 * アーツ「これが番長の実力ってやつよ」(110+):
 *   自分の#ReGLOSSを持つバックホロメンが4人以上いる時、このホロメンのアーツ+40。
 *   → dmgBonus で実装。
 *
 * ※ギフト/キーワード「メランコリャック」（[センターポジション限定]自分の#ReGLOSSを持つ
 *   コラボホロメンが受けるダメージ-20）は未実装。
 *   エンジンの「受けるダメージ」修正(damageDelta)は受け手に付いた装着カードからのみ集計され、
 *   別ホロメン（このホロメン）が他のホロメンへ被ダメージ軽減アウラを与える機構が無いため。
 *   （保留リスト: 被ダメージ割り込み / 他ホロメンを恒常強化する常時アウラ）
 */
export default {
  number: 'hBP03-015',
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
