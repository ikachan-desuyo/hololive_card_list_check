/**
 * 白上フブキ (hBP02-013) 白・2nd・HP180（#JP #1期生 #ゲーマーズ #ケモミミ #絵）
 *
 * [キーワード/ギフト] みんなと一緒！:
 *   このホロメンは、異なるカード名のマスコットを2枚まで付けられる。
 *   → hostAttachRule.mascot で実装。engine の _canAttachSupport が付け先ホロメンの hostAttachRule を
 *     参照し、マスコット2枚まで・かつ同名不可（異なるカード名）を許可する。
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
  // ギフト「みんなと一緒！」: 異なるカード名のマスコットを2枚まで付けられる
  hostAttachRule: {
    mascot(h, card) {
      const mascots = h.attachments.filter((a) => a.supportType === 'マスコット');
      if (mascots.length >= 2) return false;                 // 2枚まで
      if (mascots.some((a) => a.name === card.name)) return false; // 異なるカード名
      return true;
    },
  },
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
