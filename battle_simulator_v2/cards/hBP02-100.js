/**
 * 白銀聖騎士団 (hBP02-100) サポート・ファン
 *
 * [サポート効果]
 *   このファンが付いているホロメンが受けるダメージ-10。
 *     → attached.damageDelta で常時 -10。（複数枚付けたら各 -10 が加算される）
 *
 * このファンは、自分の〈白銀ノエル〉だけに付けられ、1人につき何枚でも付けられる。
 *     → attachRule で実装（白銀ノエル限定・unlimited）。
 *
 * 備考: ここでの「受けるダメージ-10」は装着カードによる常時の被ダメージ修正であり、
 *       エンジンの damageDelta 集計（system.js / engine._applyDamageReduction）で処理される。
 *       保留対象の「被ダメージ割り込み（受ける時に使えるタイミング割り込み）」ではない。
 */
export default {
  number: 'hBP02-100',
  attached: {
    // このファンが付いているホロメンが受けるダメージ-10
    damageDelta() {
      return -10;
    },
  },
  attachRule: {
    // 自分の〈白銀ノエル〉だけに付けられる
    canAttach(holomem) {
      return holomem.stack[0].name === '白銀ノエル';
    },
    // 1人につき何枚でも付けられる
    unlimited: true,
  },
};
