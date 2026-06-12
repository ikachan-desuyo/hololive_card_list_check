/** 春先のどか（サポート・スタッフ・LIMITED）: 自分のデッキを3枚引く */
export default {
  number: 'hSD01-016',
  support: {
    *run(ctx) {
      ctx.draw(3);
    },
  },
};
