/**
 * 白上フブキ (hBP02-013) 白・2nd・HP180（#JP #1期生 #ゲーマーズ #ケモミミ #絵）
 *
 * [キーワード/ギフト] みんなと一緒！:
 *   このホロメンは、異なるカード名のマスコットを2枚まで付けられる。
 *   → 【未実装】ホロメン側の付け先上限緩和ギフト。
 *      エンジンの _canAttachSupport は「付ける側（マスコット）の attachRule」しか参照せず、
 *      付けられる側（このホロメン）の固有ルールを読む口が無い。
 *      そのため標準のマスコット上限（1人1枚）のまま。緩和には engine 側に
 *      ホロメン固有の attach 受け入れルール（giftAttachRule 等）のフックが必要。
 *
 * [アーツ] マスコットたちの饗宴 (80+) [特攻: 紫+50]:
 *   自分のステージのマスコット1枚につき、このアーツ+20。
 *   → dmgBonus。自分のステージ（センター/コラボ/バック）の全ホロメンに付いている
 *      supportType==='マスコット' の枚数 × 20。
 *      ※「異なるカード名」制限はギフト側の話で、加算は「マスコット1枚につき」なので
 *        同名・異名を問わず全マスコットを数える。
 */
export default {
  number: 'hBP02-013',
  arts: {
    'マスコットたちの饗宴': {
      dmgBonus(ctx) {
        const mascots = ctx.holomems('self').reduce(
          (sum, e) => sum + e.holomem.attachments.filter((a) => a.supportType === 'マスコット').length,
          0,
        );
        return mascots * 20;
      },
    },
  },
};
