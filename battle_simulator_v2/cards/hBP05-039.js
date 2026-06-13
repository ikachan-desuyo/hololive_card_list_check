/**
 * 一条莉々華 (hBP05-039) 赤・Buzzホロメン・1st・HP230（#DEV_IS #ReGLOSS）
 * アーツ「人生に手遅れとかないから」(40):
 *   このターンに自分が〈限界飯〉を使っていたなら、相手のセンターホロメンとコラボホロメンに特殊ダメージ20を与える。
 *   → arts.*run（usedSupportNamed('限界飯') 判定 → 相手センター/コラボへ各特殊20）。アーツ本体40は通常通り対象へ。
 * アーツ「いつでも軌道修正できる」(70+):
 *   このアーツの対象が相手の1st以上のコラボホロメンなら、このアーツ+70。
 *   → arts.dmgBonus（artTarget が相手コラボかつ bloomLevel が 1st/2nd なら +70）。
 *
 * 保留: なし
 */
export default {
  number: 'hBP05-039',
  arts: {
    '人生に手遅れとかないから': {
      *run(ctx) {
        if (!ctx.usedSupportNamed('限界飯')) return; // このターンに〈限界飯〉を使っていたなら
        // 相手のセンターホロメンとコラボホロメンに特殊ダメージ20
        const targets = ctx.holomems('opp', (e) => e.pos.zone === 'center' || e.pos.zone === 'collab');
        for (const t of targets) {
          yield* ctx.dealSpecialDamage(t, 20);
        }
      },
    },
    'いつでも軌道修正できる': {
      dmgBonus(ctx) {
        // このアーツの対象が相手の1st以上のコラボホロメンなら +70
        const target = ctx.artTarget;
        if (!target) return 0;
        if (ctx.opponent.collab !== target) return 0; // 相手のコラボホロメンが対象
        const level = target.stack[0]?.bloomLevel;
        return (level === '1st' || level === '2nd') ? 70 : 0; // 1st以上
      },
    },
  },
};
