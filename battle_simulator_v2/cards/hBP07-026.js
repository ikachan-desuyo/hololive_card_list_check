/**
 * 大神ミオ 1st (hBP07-026)
 * ブルームエフェクト「早く来ないかな…」:
 *   自分のデッキから、〈ハトタウロス〉か〈ミオファ〉1枚を公開し、手札に加える。
 *   そしてデッキをシャッフルする。
 * アーツ「ちょっとお洒落な感じでしょ？」: dmg 40（テキスト効果なし。ダメージはエンジンが処理）。
 */
const SEARCH_NAMES = ['ハトタウロス', 'ミオファ'];

export default {
  number: 'hBP07-026',
  bloomEffect: {
    name: '早く来ないかな…',
    *run(ctx) {
      const candidates = ctx.deckCards((c) => SEARCH_NAMES.includes(c.name));
      if (candidates.length > 0) {
        const picked = yield ctx.chooseCard({
          cards: candidates,
          title: '手札に加える〈ハトタウロス〉か〈ミオファ〉を選択',
        });
        if (picked) {
          ctx.removeFromDeck(picked);
          ctx.addToHand(picked, { reveal: true });
        }
      } else {
        ctx.log('デッキに〈ハトタウロス〉/〈ミオファ〉が見つからない');
      }
      // 探した結果に関わらずデッキをシャッフルする
      ctx.shuffleDeck();
    },
  },
};
