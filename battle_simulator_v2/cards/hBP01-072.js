/**
 * ハコス・ベールズ (hBP01-072) 赤・Debut・HP80（#EN #Promise #ケモミミ）
 * アーツ「WAZZUP!!」(20):
 *   このホロメンに赤エールが付いている時、サイコロを１回振れる：
 *   奇数の時、相手のコラボホロメンに特殊ダメージ20を与える。
 *
 * 解釈:
 *  - 「赤エールが付いている時」= このホロメンの cheers に赤エールがあるときのみ発動可能。
 *  - 「振れる」= 任意（confirm）。振って奇数（1/3/5）なら相手のコラボホロメンへ特殊ダメージ20。
 *  - 相手にコラボホロメンがいない場合は対象不在で何も起きない。
 *  - 特殊ダメージはアーツ本体のダメージ計算とは別に与える（onDownDealt系の記載は無い）。
 */
export default {
  number: 'hBP01-072',
  arts: {
    'WAZZUP!!': {
      *run(ctx) {
        const hasRedCheer = (ctx.sourceHolomem?.cheers || []).some((c) => c.color === '赤');
        if (!hasRedCheer) return;
        const ok = yield ctx.confirm('「WAZZUP!!」: サイコロを1回振りますか？（奇数で相手コラボに特殊ダメージ20）');
        if (!ok) return;
        const roll = ctx.rollDice();
        if (roll % 2 === 0) {
          ctx.log('偶数のため効果は発動しない');
          return;
        }
        const collab = ctx.holomems('opp', (e) => e.pos.zone === 'collab')[0];
        if (!collab) {
          ctx.log('相手にコラボホロメンがいないため対象なし');
          return;
        }
        ctx.dealSpecialDamage(collab, 20);
      },
    },
  },
};
