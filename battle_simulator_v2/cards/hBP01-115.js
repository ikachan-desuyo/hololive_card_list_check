/**
 * 星街すいせいのマイク (hBP01-115) サポート・ツール
 *
 * [サポート効果] このツールが付いているホロメンのアーツ+10。
 *   → attached.artsPlus で常時+10（付いている間ずっと）。
 *
 * ◆1st以上の〈星街すいせい〉に付いていたら能力追加:
 *   このツールが付いているホロメンが相手のホロメンをダウンさせた時、
 *   自分のエールデッキの上から1枚を、このホロメンに送る。
 *   → triggers.onOpponentDown で実装。付け先が1st以上の〈星街すいせい〉の時、
 *     エールデッキの上から1枚をこのホロメン（ホスト）に送る。
 *
 * ツールは、自分のホロメン1人につき1枚だけ付けられる
 *   → エンジン既定のツール装着上限（_canAttachSupport）と同じため attachRule 不要。
 */
export default {
  number: 'hBP01-115',
  attached: {
    artsPlus() {
      return 10;
    },
  },
  triggers: {
    // ◆1st以上の〈星街すいせい〉に付いていたら: ホストが相手をダウンさせた時、エールデッキの上から1枚をホストに送る
    * onOpponentDown(ctx) {
      const host = ctx.sourceHolomem;
      const top = host?.stack[0];
      if (!top || top.name !== '星街すいせい') return;
      if (top.bloomLevel !== '1st' && top.bloomLevel !== '2nd') return; // 1st以上
      if (ctx.player.cheerDeck.length === 0) return;
      ctx.sendCheerFromCheerDeckTop(host);
    },
  },
};
