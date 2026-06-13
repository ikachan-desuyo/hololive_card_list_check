/**
 * さくらみこ (hBP03-028) 赤・1st・HP130（#JP #0期生 #ベイビー）
 * アーツ「応援頼んだぞ」(30): 効果テキストなし（基本ダメージのみ）。
 * アーツ「みこぴー！(｀・ω・´)🌸」(50):
 *   サイコロを1回振れる：
 *     2か4か6の時、相手のセンターホロメンに特殊ダメージ20を与える。
 *     3か5の時、相手のセンターホロメンとコラボホロメンに特殊ダメージ20を与える。
 *   （1の時は何も起きない）
 */
export default {
  number: 'hBP03-028',
  arts: {
    'みこぴー！(｀・ω・´)🌸': {
      *run(ctx) {
        const ok = yield ctx.confirm('サイコロを1回振りますか？（2/4/6: センターに特殊20、3/5: センターとコラボに特殊20）');
        if (!ok) return;
        const value = ctx.rollDice();
        if (value === 2 || value === 4 || value === 6) {
          // 相手のセンターホロメンに特殊ダメージ20
          const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
          if (center) ctx.dealSpecialDamage(center, 20);
        } else if (value === 3 || value === 5) {
          // 相手のセンターホロメンとコラボホロメンに特殊ダメージ20
          const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
          if (center) ctx.dealSpecialDamage(center, 20);
          const collab = ctx.holomems('opp', (e) => e.pos.zone === 'collab')[0];
          if (collab) ctx.dealSpecialDamage(collab, 20);
        }
        // 1 の時は何も起きない
      },
    },
  },
};
