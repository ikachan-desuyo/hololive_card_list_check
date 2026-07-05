/**
 * Death-sensei (hBP02-098) サポート・マスコット
 *
 * [サポート効果] このマスコットが付いているホロメンのHP+20。
 *   → attached.hpPlus で常時 +20（付け先を問わず）。
 *
 * ◆〈森カリオペ〉に付いていたら能力追加:
 *   このマスコットが付いているホロメンのアーツに必要なエールの色すべてを無色にする。
 *   → attached.artsCostAllColorless で実装。engine の _effectiveArtCost が、付け先が〈森カリオペ〉の時に
 *     必要エールの色指定をすべて無色化する（枚数は維持＝任意色で支払える）。
 *
 * マスコットは自分のホロメン1人につき1枚だけ（エンジン既定の付け先ルールで担保）。
 */
export default {
  number: 'hBP02-098',
  attached: {
    // このマスコットが付いているホロメンのHP+20（付け先を問わず常時）
    hpPlus() {
      return 20;
    },
    // ◆〈森カリオペ〉に付いていたら: アーツの必要エール色をすべて無色にする
    artsCostAllColorless(holomem) {
      return holomem.stack[0].name === '森カリオペ';
    },
  },
};
