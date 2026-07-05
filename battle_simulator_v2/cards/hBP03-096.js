/**
 * ライフル (hBP03-096) サポート・ツール
 * [サポート効果] このツールが付いているホロメンのアーツ+10。
 * ◆#シューターを持つ1st以上のホロメンに付いていたら能力追加:
 *   このツールが付いているホロメンが、相手のホロメン1人に与える特殊ダメージ+10。
 * ツールは、自分のホロメン1人につき1枚だけ付けられる（ツールの既定ルール）。
 */
export default {
  number: 'hBP03-096',
  attached: {
    artsPlus() { return 10; },
    specialDmgPlus(sourceHolomem) {
      // 条件追加: 付いている先が #シューター を持つ 1st 以上のホロメン
      const host = sourceHolomem.stack[0];
      const isOver1st = ['1st', '2nd'].includes(host.bloomLevel);
      const hasShooter = (host.tags || []).includes('シューター');
      // 相手のホロメンへの特殊ダメージならゾーン問わず +10（テキストに対象ゾーンの限定なし）
      return (isOver1st && hasShooter) ? 10 : 0;
    },
  },
};
