/**
 * エルフレンド (hSD07-015) サポート・ファン
 *
 * [サポート効果]
 *  ■このファンが付いているホロメンのHP+10。
 *    → attached.hpPlus で常時 +10。（複数枚付けたら各 +10 が加算される）
 *
 * このファンは、自分の〈不知火フレア〉だけに付けられ、1人につき何枚でも付けられる。
 *    → attachRule で実装（canAttach で名前判定、unlimited で何枚でも）。
 */
export default {
  number: 'hSD07-015',
  attached: {
    // ■このファンが付いているホロメンのHP+10
    hpPlus() { return 10; },
  },
  attachRule: {
    canAttach(holomem) {
      return holomem.stack[0].name === '不知火フレア';
    },
    unlimited: true, // 1人に何枚でも
  },
};
