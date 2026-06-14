/**
 * 金時 (hBP03-098) サポート・マスコット
 *
 * [サポート効果] このマスコットが付いているホロメンのHP+20。
 *   → attached.hpPlus で常時 +20。
 *
 * ◆〈さくらみこ〉に付いていたら能力追加:
 *   このマスコットが付いているホロメンがコラボした時、自分のデッキを1枚引く。
 *   → triggers.onCollab で実装（ホストが〈さくらみこ〉のときコラボで ctx.draw(1)）。
 *
 * マスコットは、自分のホロメン1人につき1枚だけ付けられる
 *   （エンジン既定のマスコット制限で処理されるため attachRule 不要）。
 */
export default {
  number: 'hBP03-098',
  attached: {
    // [サポート効果] 付いているホロメンのHP+20
    hpPlus() { return 20; },
  },
  triggers: {
    // ◆〈さくらみこ〉に付いていたら: ホストがコラボした時、自分のデッキを1枚引く
    * onCollab(ctx) {
      if (ctx.sourceHolomem?.stack[0].name !== 'さくらみこ') return;
      ctx.draw(1);
    },
  },
};
