/**
 * Bloom＆Gloom (hBP08-105) サポート・マスコット
 *
 * [サポート効果]
 *  ■このマスコットが付いているホロメンのHP+20。
 *    → attached.hpPlus で常時 +20。
 *
 *  ◆〈IRyS〉に付いていたら能力追加
 *    このホロメンに白エールと紫エールが付いているなら、このホロメンのアーツ+20。
 *    → attached.artsPlus で、付け先が〈IRyS〉（名前が「IRyS」のホロメン）であり、
 *      かつ付いているエールに白(白)・紫(紫)が両方ある間だけ +20。
 *
 * 付け先制限: マスコットは自分のホロメン1人につき1枚（エンジン既定の付け上限で担保）。
 *   付け先はホロメン全般。〈IRyS〉に付いた時のみ追加のアーツ+20が有効になる。
 *
 * 保留: なし。
 */
const NAME = 'IRyS';
const WHITE = '白';
const PURPLE = '紫';

export default {
  number: 'hBP08-105',
  attached: {
    // ■このマスコットが付いているホロメンのHP+20
    hpPlus() {
      return 20;
    },
    // ◆〈IRyS〉に付いていて、白エールと紫エールが両方付いているなら、このホロメンのアーツ+20
    artsPlus(holomem) {
      const top = holomem.stack[0];
      if (!top || top.name !== NAME) return 0;
      const hasWhite = holomem.cheers.some((c) => c.color === WHITE);
      const hasPurple = holomem.cheers.some((c) => c.color === PURPLE);
      return (hasWhite && hasPurple) ? 20 : 0;
    },
  },
};
