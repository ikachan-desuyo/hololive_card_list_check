/**
 * ころねすきー (hBP03-111) サポート・ファン
 * このファンが付いているホロメンのバトンタッチに必要な無色エール-1。
 *   → batonCostReduceAttached（常時。〈戌神ころね〉専用なので付け先は限定）
 * このファンは、自分の〈戌神ころね〉だけに付けられ、1人につき何枚でも付けられる。
 */
export default {
  number: 'hBP03-111',
  attachRule: {
    canAttach(holomem) {
      return holomem.stack[0].name === '戌神ころね';
    },
    unlimited: true,
  },
  batonCostReduceAttached() {
    return [{ color: '無色', amount: 1 }];
  },
};
