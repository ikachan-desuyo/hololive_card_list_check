/**
 * リコーダー (hBP03-097) サポート・ツール
 *
 * [サポート効果] このツールが付いているホロメンのアーツ+10。
 *   → attached.artsPlus で常時 +10。
 *
 * ◆1st以上の〈音乃瀬奏〉に付いていたら能力追加（未実装）:
 *   このツールが付いているホロメンが相手のホロメンをダウンさせた時、自分のデッキを1枚引く。
 *   → 「装着カードがダウンさせた時に発火するトリガー」がエンジンに無いため保留。
 *      engine.js の onOpponentDown は付いているホロメンの最上段カード
 *      （topCard(h).number）の triggers.onOpponentDown しか発火せず、
 *      装着カード（このツール）の triggers は走査されない。
 *      装着カードの onOpponentDown ディスパッチが入ったら、以下を有効化できる:
 *        triggers.onOpponentDown: 付け先が1st以上の〈音乃瀬奏〉なら ctx.draw(1)
 *
 * ツールは、自分のホロメン1人につき1枚だけ付けられる（ツールの既定ルール。
 * _canAttachSupport がツール=1枚を既定で適用するため attachRule 不要）。
 */
export default {
  number: 'hBP03-097',
  attached: {
    artsPlus() { return 10; },
  },
  triggers: {
    // ◆1st以上の〈音乃瀬奏〉に付いていたら: ホストが相手をダウンさせた時、自分のデッキを1枚引く
    * onOpponentDown(ctx) {
      const top = ctx.sourceHolomem?.stack[0];
      if (!top || top.name !== '音乃瀬奏') return;
      if (top.bloomLevel !== '1st' && top.bloomLevel !== '2nd') return;
      ctx.draw(1);
    },
  },
};
