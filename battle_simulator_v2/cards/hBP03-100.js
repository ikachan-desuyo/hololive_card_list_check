/**
 * ペロ (hBP03-100) サポート・マスコット
 *
 * [サポート効果] このマスコットが付いているホロメンのHP+20。
 *   → attached.hpPlus で常時 +20。
 *
 * ◆〈フワワ・アビスガード〉か〈モココ・アビスガード〉に付いていたら能力追加:
 *   このマスコットが付いているホロメンのアーツに必要なエールの色すべてを無色エールにする。
 *   → attached.artsCostAllColorless で実装（付け先が〈フワワ〉か〈モココ〉の時、必要エール色を無色化）。
 *
 * マスコットは自分のホロメン1人につき1枚だけ（エンジン既定の付け先ルールで担保）。
 */
export default {
  number: 'hBP03-100',
  attached: {
    // このマスコットが付いているホロメンのHP+20（付け先を問わず常時）
    hpPlus() {
      return 20;
    },
    // ◆〈フワワ/モココ・アビスガード〉に付いていたら: アーツの必要エール色をすべて無色にする
    artsCostAllColorless(holomem) {
      // 名称参照（FUWAMOCO の別名「〈フワワ〉〈モココ〉として扱う」も一致）
      const top = holomem.stack[0];
      const al = top.nameAliases || [];
      const has = (x) => top.name === x || al.includes(x);
      return has('フワワ・アビスガード') || has('モココ・アビスガード');
    },
  },
};
