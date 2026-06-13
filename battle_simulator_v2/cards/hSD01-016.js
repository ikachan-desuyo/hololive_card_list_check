/** 春先のどか（サポート・スタッフ・LIMITED）: 自分のデッキを3枚引く */
export default {
  number: 'hSD01-016',
  ai: {
    supportValue({ player }) {
      return 26 + Math.max(0, 6 - player.hand.length) * 4;
    },
  },
  support: {
    *run(ctx) {
      ctx.draw(3);
    },
  },
};
