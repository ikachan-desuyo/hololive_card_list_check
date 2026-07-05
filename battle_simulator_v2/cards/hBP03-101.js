/**
 * ビビ (hBP03-101) サポート・マスコット
 * [サポート効果] このマスコットが付いているホロメンのHP+20。
 * ◆〈常闇トワ〉に付いていたら能力追加:
 *   このマスコットが付いているホロメンが、相手のホロメン1人に与える特殊ダメージ+10。
 * マスコットは、自分のホロメン1人につき1枚だけ付けられる（マスコットの既定ルール）。
 */
export default {
  number: 'hBP03-101',
  attached: {
    hpPlus() { return 20; },
    specialDmgPlus(sourceHolomem) {
      // 条件追加: 付いている先が〈常闇トワ〉なら、相手ホロメンへの特殊ダメージ+10
      const host = sourceHolomem.stack[0];
      return host.name === '常闇トワ' ? 10 : 0;
    },
  },
};
