/**
 * ろぼさー (hBP03-110) サポート・ファン
 *
 * [サポート効果]
 *  ■このファンが付いているホロメンがアーツを使う時、このファンを紫エールとしても扱う。
 *    → attached.cheerSupply で実装（アーツ使用時に紫エール1個を擬似供給）。
 *
 *  ■このファンが付いているホロメンのアーツ-10。
 *    → attached.artsPlus で常時 -10。（複数枚付けたら各 -10 が加算される）
 *
 * このファンは、自分の〈ロボ子さん〉だけに付けられ、1人につき何枚でも付けられる。
 *    → attachRule で実装。
 */
export default {
  number: 'hBP03-110',
  attached: {
    // ■このファンが付いているホロメンのアーツ-10
    artsPlus() { return -10; },
    // ■このファンが付いているホロメンがアーツを使う時、このファンを紫エールとしても扱う（擬似エール供給）
    cheerSupply() { return [{ color: '紫' }]; },
  },
  attachRule: {
    canAttach(holomem) {
      return holomem.stack[0].name === 'ロボ子さん';
    },
    unlimited: true, // 1人に何枚でも
  },
};
