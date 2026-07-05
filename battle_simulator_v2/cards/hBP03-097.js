/**
 * リコーダー (hBP03-097) サポート・ツール
 *
 * [サポート効果] このツールが付いているホロメンのアーツ+10。
 *   → attached.artsPlus で常時 +10。
 *
 * ◆1st以上の〈音乃瀬奏〉に付いていたら能力追加:
 *   このツールが付いているホロメンが相手のホロメンをダウンさせた時、自分のデッキを1枚引く。
 *   → triggers.onOpponentDown で実装。付け先が1st以上の〈音乃瀬奏〉なら ctx.draw(1)。
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
