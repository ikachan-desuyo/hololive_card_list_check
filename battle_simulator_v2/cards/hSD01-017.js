/**
 * マネちゃん（サポート・スタッフ・LIMITED）
 * このカードは、自分の手札がこのカードを含まずに1枚以上なければ使えない。
 * 自分の手札すべてをデッキに戻してシャッフルする。そして自分のデッキを5枚引く。
 */
export default {
  number: 'hSD01-017',
  ai: {
    // 手札が機能していない（出せる/使えるカードが少ない）時だけ価値がある
    supportValue({ engine, player }) {
      const useful = player.hand.filter((c) =>
        c.kind === 'holomen' || engine.registry.get(c.number)?.support).length;
      return player.hand.length >= 4 && useful <= 2 ? 35 : 0;
    },
  },
  support: {
    canUse(ctx) {
      // プレイ時点で手札からは取り除かれていないため「自分を除いて1枚以上」
      return ctx.player.hand.length >= 2;
    },
    *run(ctx) {
      ctx.returnHandToDeck();
      ctx.shuffleDeck();
      ctx.draw(5);
    },
  },
};
