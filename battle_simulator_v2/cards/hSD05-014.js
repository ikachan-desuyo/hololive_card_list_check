/**
 * ばんぺん (hSD05-014) サポート・マスコット
 *
 * [サポート効果]
 *  ■このマスコットが付いているホロメンのアーツ+10。
 *    → attached.artsPlus で常時 +10。
 *
 *  ◆〈轟はじめ〉に付いていたら能力追加
 *    このマスコットが付いているホロメンのHP+20。
 *    → attached.hpPlus で、付け先が〈轟はじめ〉のときのみ +20。
 *
 * マスコットは、自分のホロメン1人につき1枚だけ付けられる（マスコット標準ルール=エンジン既定。
 * attachRule 不要）。
 */
export default {
  number: 'hSD05-014',
  attached: {
    // ■アーツ+10（常時）
    artsPlus() { return 10; },
    // ◆〈轟はじめ〉に付いていたら HP+20
    hpPlus(holomem) {
      return holomem.stack[0].name === '轟はじめ' ? 20 : 0;
    },
  },
};
