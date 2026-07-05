/**
 * Kronies (hBP07-109) サポート・ファン
 * [サポート効果] このファンが付いているホロメンのアーツ+10。
 * このファンは、自分の〈オーロ・クロニー〉だけに付けられ、1人につき何枚でも付けられる。
 */
export default {
  number: 'hBP07-109',
  attachRule: {
    canAttach(holomem) {
      return holomem.stack[0].name === 'オーロ・クロニー';
    },
    unlimited: true, // 1人に何枚でも
  },
  attached: {
    artsPlus() {
      return 10;
    },
  },
};
