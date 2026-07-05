/**
 * ASMRマイク (hBP07-101) サポート・ツール
 * ◆Buzzホロメンに付いていたら能力追加: このホロメンのアーツに必要な無色-1。
 *   → artsCostReduceAttached（装着先がBuzzなら必要無色-1）
 * ツールは、自分のホロメン1人につき1枚だけ付けられる。
 */
export default {
  number: 'hBP07-101',
  artsCostReduceAttached(host) {
    return host.stack[0].buzz ? [{ color: '無色', amount: 1 }] : [];
  },
};
