/**
 * ドクロくん (hBP02-095) サポート・マスコット
 *
 * [サポート効果] このマスコットが付いているホロメンのアーツ+10。
 *   → attached.artsPlus で常時 +10。
 *
 * ◆〈宝鐘マリン〉に付いていたら能力追加
 *   [センターポジション限定]このマスコットが付いているホロメンがBloomした時、自分のデッキを1枚引く。
 *   → triggers.onBloom（装着カードのトリガー。engine がホストのBloom時に装着カードの onBloom も発火）。
 *
 * マスコットは、自分のホロメン1人につき1枚だけ付けられる（マスコット標準ルール。
 * エンジン側で制限されるため attachRule は不要）。
 */
export default {
  number: 'hBP02-095',
  attached: {
    // このマスコットが付いているホロメンのアーツ+10
    artsPlus() {
      return 10;
    },
  },
  triggers: {
    // ◆〈宝鐘マリン〉に付いていたら: [センター限定]ホストがBloomした時、自分のデッキを1枚引く
    *onBloom(ctx) {
      if (ctx.sourceHolomem?.stack[0].name !== '宝鐘マリン') return;
      if (ctx.sourceHolomemPos()?.zone !== 'center') return;
      ctx.draw(1);
    },
  },
};
