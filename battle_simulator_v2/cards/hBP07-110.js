/**
 * ねっ子 (hBP07-110) サポート・ファン
 * [ターンに1回]このファンが付いているホロメンのBloomレベルが上がった時、自分のデッキを1枚引く。
 *   → triggers.onBloom（ホストがBloomした時に発火）。ホロメンは1ターンに1回しかBloomできないため
 *     「ターンに1回」は自然に満たされる。
 * このファンは、自分の〈桃鈴ねね〉だけに付けられ、1人につき何枚でも付けられる。
 */
export default {
  number: 'hBP07-110',
  attachRule: {
    canAttach(holomem) {
      return holomem.stack[0].name === '桃鈴ねね';
    },
    unlimited: true,
  },
  triggers: {
    *onBloom(ctx) {
      ctx.draw(1);
    },
  },
};
