/**
 * Popo (hSD13-018) サポート・マスコット
 *
 * [サポート効果] このマスコットが付いているホロメンのHP+20。
 *   → attached.hpPlus で常時 +20。
 *
 * ◆〈ジジ・ムリン〉に付いていたら能力追加
 *   このホロメンに重なっているホロメンが0枚なら、このホロメンのアーツ+20。
 *   → attached.artsPlus で、付け先の名前が〈ジジ・ムリン〉かつ
 *     重なっているホロメンが0枚（= stack が基底1枚のみ）の場合に +20。
 *
 * ※ マスコットは自分のホロメン1人につき1枚（エンジン既定の付け上限。attachRule 不要）。
 */
export default {
  number: 'hSD13-018',
  attached: {
    // このマスコットが付いているホロメンのHP+20
    hpPlus() { return 20; },
    // 〈ジジ・ムリン〉に付いていて、重なっているホロメンが0枚（stack が基底のみ）ならアーツ+20
    artsPlus(holomem) {
      if (holomem.stack[0].name !== 'ジジ・ムリン') return 0;
      // 重なっているホロメン枚数 = stack.length - 1（先頭は基底ホロメン）
      const stackedOn = (holomem.stack.length || 1) - 1;
      return stackedOn === 0 ? 20 : 0;
    },
  },
};
