/**
 * モココ・アビスガード 1st (hBP03-038) 赤・HP130（#EN #Advent #ケモミミ）
 * ブルームエフェクト「遊びの時間だー！」:
 *   DebutからBloomした時、自分のデッキから、1stホロメンの〈フワワ・アビスガード〉1枚を
 *   公開し、手札に加える。そしてデッキをシャッフルする。
 * アーツ「モココとドーナツクッキング」(30): テキスト効果なし（素のダメージのみ）。
 *
 * 注: 「DebutからBloomした時」の発火条件はエンジンの bloomEffect 呼び出し側で扱う想定。
 *     ここではブルーム時に呼ばれた前提で効果本体のみ実装する（hBP02-022 と同形）。
 */
export default {
  number: 'hBP03-038',
  bloomEffect: {
    name: '遊びの時間だー！',
    *run(ctx) {
      const candidates = ctx.deckCards(
        (c) => c.name === 'フワワ・アビスガード' && c.bloomLevel === '1st'
      );
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: '手札に加える1stホロメンの〈フワワ・アビスガード〉を選択',
        optional: true,
        skipLabel: '見つからなかったことにする',
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked);
      }
      ctx.shuffleDeck();
    },
  },
};
