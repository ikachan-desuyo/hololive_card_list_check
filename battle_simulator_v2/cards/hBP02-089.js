/**
 * おるやんけ (hBP02-089) サポート・マスコット（#白上'sキャラクター）
 *
 * [サポート効果]
 *  ■このマスコットが付いているホロメンのHP+20。
 *    → attached.hpPlus で常時 +20。
 *
 *  ◆〈白上フブキ〉に付いていたら能力追加
 *  ■このマスコットが付いているホロメンがコラボした時、自分のデッキを1枚引く。
 *    → triggers.onCollab で実装（ホストがコラボした時に発火。sourceHolomem=ホスト）。
 *
 * ※ マスコットは自分のホロメン1人につき1枚（エンジン既定の付け上限。attachRule 不要）。
 */
export default {
  number: 'hBP02-089',
  attached: {
    // ■このマスコットが付いているホロメンのHP+20
    hpPlus() { return 20; },
  },
  triggers: {
    // ◆〈白上フブキ〉に付いていたら: ホストがコラボした時、自分のデッキを1枚引く
    * onCollab(ctx) {
      if (ctx.sourceHolomem?.stack[0].name !== '白上フブキ') return;
      ctx.draw(1);
    },
  },
};
