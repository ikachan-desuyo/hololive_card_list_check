/**
 * ありよりのアリゲーター (hSD14-011) サポート・マスコット
 *
 * [サポート効果] このマスコットが付いているホロメンのHP+10。
 *   → attached.hpPlus で常時 +10（付いている間ずっと。後始末不要）。
 *
 * ◆〈白上フブキ〉に付いていたら能力追加:
 *   このマスコットが付いているホロメンが相手のホロメンをダウンさせた時、
 *   自分のエールデッキの上から1枚を自分のホロメンに送る。
 *   → triggers.onOpponentDown で実装。付け先が〈白上フブキ〉の時、エールデッキの上から1枚を
 *     選んだ自分のホロメンに送る（sendCheerFromCheerDeckTop）。
 *
 * マスコットは、自分のホロメン1人につき1枚だけ付けられる
 *   → マスコット共通の装着上限はエンジンが制御するため attachRule 不要。
 */
export default {
  number: 'hSD14-011',
  attached: {
    // このマスコットが付いているホロメンのHP+10
    hpPlus() { return 10; },
  },
  triggers: {
    // ◆〈白上フブキ〉に付いていたら: ホストが相手をダウンさせた時、エールデッキの上から1枚を自分のホロメンに送る
    * onOpponentDown(ctx) {
      if (ctx.sourceHolomem?.stack[0].name !== '白上フブキ') return;
      if (ctx.player.cheerDeck.length === 0) return;
      const entry = yield ctx.chooseHolomem({ side: 'self', title: 'エールを送る自分のホロメンを選択' });
      if (entry) ctx.sendCheerFromCheerDeckTop(entry.holomem);
    },
  },
};
