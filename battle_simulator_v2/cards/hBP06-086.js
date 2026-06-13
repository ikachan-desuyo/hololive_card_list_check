/**
 * 愛情いっぱい召し上がれ♪ (hBP06-086) サポート・イベント・LIMITED
 * 自分のデッキを1枚引く。その後、自分のホロメン1人のHP100回復。
 * LIMITED：ターンに1枚しか使えない。
 */
export default {
  number: 'hBP06-086',
  support: {
    *run(ctx) {
      ctx.draw(1);
      const target = yield ctx.chooseHolomem({ side: 'self', title: 'HP100回復するホロメンを選択' });
      if (target) ctx.heal(target.holomem, 100);
    },
  },
};
