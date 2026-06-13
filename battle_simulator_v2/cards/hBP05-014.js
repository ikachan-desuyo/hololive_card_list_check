/**
 * 兎田ぺこら (hBP05-014) 白・Debut・HP110（#3期生）
 * アーツ「かわいいぺこか？」(20): サイコロを1回振れる：偶数なら、自分のデッキを1枚引く。
 */
export default {
  number: 'hBP05-014',
  arts: {
    'かわいいぺこか？': {
      *run(ctx) {
        const ok = yield ctx.confirm('サイコロを振りますか？', '振る', '振らない');
        if (!ok) return;
        if (ctx.rollDice() % 2 === 0) ctx.draw(1);
      },
    },
  },
};
