/**
 * 不知火フレア (hSD07-009) 黄・2nd・HP180（#JP #3期生 #ハーフエルフ）
 * [キーワード/ギフト]「疲れ知らず」: [センターポジション限定]このホロメンが受けるダメージ-10。
 *   → auraDamageDelta（自己ギフト）で実装。センターにいる間、自身が受けるダメージ-10（常時）。
 * [アーツ]「情熱ステージ」(70+): 自分のライフが3以下の時、このアーツ+70。
 *   → dmgBonus で実装。
 */
export default {
  number: 'hSD07-009',
  // キーワード「疲れ知らず」: [センター限定]このホロメンが受けるダメージ-10
  auraDamageDelta(src, target, zone) {
    if (src !== target) return 0;     // 自分自身のみ
    if (zone !== 'center') return 0;  // [センターポジション限定]
    return -10;
  },
  arts: {
    '情熱ステージ': {
      dmgBonus(ctx) {
        return ctx.player.life.length <= 3 ? 70 : 0;
      },
    },
  },
};
