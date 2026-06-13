/**
 * 兎田ぺこら (hBP01-038) 緑・Debut・HP90（#JP #3期生 #ケモミミ）
 * アーツ「こんぺこー！」(20+):
 *   サイコロを１回振れる：偶数の時、このアーツ+20。
 *   → 「振れる」=任意なので confirm で振るか選択。偶数(2/4/6)なら +20。
 */
export default {
  number: 'hBP01-038',
  arts: {
    'こんぺこー！': {
      *run(ctx) {
        const ok = yield ctx.confirm('「こんぺこー！」: サイコロを1回振りますか？（偶数でこのアーツ+20）', '振る', '振らない');
        if (!ok) return;
        const roll = (yield* ctx.rollDice());
        if (roll % 2 === 0) {
          ctx.addArtBonus(20, `サイコロ${roll}（偶数）`);
        } else {
          ctx.log(`サイコロ${roll}（奇数）のため効果なし`);
        }
      },
    },
  },
};
