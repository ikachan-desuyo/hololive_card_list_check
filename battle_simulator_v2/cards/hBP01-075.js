/**
 * ハコス・ベールズ (hBP01-075)
 * コラボエフェクト: お互い、手札すべてを好きな順でデッキの下に戻す。
 * 次に、お互い、デッキに戻したカード1枚につき、それぞれのデッキを1枚引く。
 */
export default {
  number: 'hBP01-075',
  collabEffect: {
    name: 'コラボエフェクト',
    *run(ctx) {
      const counts = [];
      for (const p of [ctx.player, ctx.opponent]) {
        const n = p.hand.length;
        counts.push(n);
        p.deck.push(...p.hand); // 順序選択は省略（戻した順）
        p.hand = [];
        ctx.log(`${p.name}: 手札${n}枚をデッキの下に戻した`);
      }
      [ctx.player, ctx.opponent].forEach((p, i) => {
        for (let k = 0; k < counts[i] && p.deck.length > 0; k++) {
          p.hand.push(p.deck.shift());
        }
        ctx.log(`${p.name}: ${counts[i]}枚ドロー`);
      });
    },
  },
};
