/**
 * しょこら (hSD04-014) サポート・マスコット
 *
 * [サポート効果] このマスコットが付いているホロメンのHP+20。
 *   → attached.hpPlus で常時+20（付いている間ずっと）。
 *
 * ◆〈癒月ちょこ〉に付いていたら能力追加:
 *   このマスコットが付いているホロメンがBloomした時、このホロメンのHP20回復。
 *   → triggers.onBloom で実装。付け先が〈癒月ちょこ〉の時、Bloomした時にホスト(このホロメン)のHP20回復。
 *
 * マスコットは、自分のホロメン1人につき1枚だけ付けられる
 *   → エンジン既定のマスコット装着上限（_canAttachSupport）と同じため attachRule 不要。
 */
export default {
  number: 'hSD04-014',
  attached: {
    // このマスコットが付いているホロメンのHP+20
    hpPlus() {
      return 20;
    },
  },
  triggers: {
    // ◆〈癒月ちょこ〉に付いていたら: ホストがBloomした時、このホロメン(ホスト)のHP20回復
    * onBloom(ctx) {
      const host = ctx.sourceHolomem;
      if (host?.stack[0].name !== '癒月ちょこ') return;
      ctx.heal(host, 20);
    },
  },
};
