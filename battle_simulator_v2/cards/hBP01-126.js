/**
 * 座員 (hBP01-126) サポート・ファン
 *
 * [サポート効果]
 *  ■このファンが付いているホロメンがアーツを使う時、このファンを赤エールとしても扱う。
 *    → attached.cheerSupply で実装（アーツ使用時に赤エール1個を擬似供給）。
 *
 *  ■このファンが付いているホロメンが受けるダメージ+10。
 *    → attached.damageDelta で常時 +10。（複数枚付けたら各 +10 が加算される）
 *
 * このファンは、自分の〈尾丸ポルカ〉だけに付けられ、1人につき何枚でも付けられる。
 *    → attachRule で実装。
 */
export default {
  number: 'hBP01-126',
  attached: {
    // ■このファンが付いているホロメンが受けるダメージ+10
    damageDelta() { return 10; },
    // ■このファンが付いているホロメンがアーツを使う時、このファンを赤エールとしても扱う（擬似エール供給）
    cheerSupply() { return [{ color: '赤' }]; },
  },
  attachRule: {
    canAttach(holomem) {
      return holomem.stack[0].name === '尾丸ポルカ';
    },
    unlimited: true, // 1人に何枚でも
  },
};
