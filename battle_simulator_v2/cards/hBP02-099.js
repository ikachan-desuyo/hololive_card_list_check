/**
 * すこん部 (hBP02-099) サポート・ファン
 *
 * [サポート効果] このファンが付いているホロメンのHP+10。
 *   → attached.hpPlus で常時 +10。
 *
 * このファンは、自分の〈白上フブキ〉だけに付けられ、1人につき何枚でも付けられる。
 *   → attachRule.canAttach（白上フブキのみ）＋ unlimited（何枚でも）。
 */
export default {
  number: 'hBP02-099',
  attached: {
    // このファンが付いているホロメンのHP+10
    hpPlus() { return 10; },
  },
  attachRule: {
    canAttach(holomem) {
      return holomem.stack[0].name === '白上フブキ';
    },
    unlimited: true, // 1人に何枚でも
  },
};
