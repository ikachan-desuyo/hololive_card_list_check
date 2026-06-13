/**
 * 夏色まつり (hBP06-076) 黄・1st・HP250・Buzzホロメン（#JP #1期生 #シューター）
 *
 * ブルームエフェクト「レッツパフォーミング」:
 *   自分のデッキから、〈えびふらいおん〉か〈まつりす〉1枚を公開し、手札に加える。
 *   そしてデッキをシャッフルする。
 *   → bloomEffect で実装。
 *
 * アーツ「まつりちゃんにメロメロになれよ❤︎」(50+):
 *   このアーツの対象が相手の2ndホロメンで、このターンに自分がLIMITEDのイベントを
 *   使っていたなら、このアーツ+70。
 *   → 【未実装】「+70」の条件のうち「このアーツの対象が相手の2ndホロメン」は、
 *     dmgBonus フック（runCtx）にアーツの対象ホロメンが渡されないため判定できない。
 *     対象に依存する条件付きアーツ修正は現状の効果システムでは表現できないため、
 *     このアーツの +70 効果は実装を保留する（dmgBonus は定義しない）。
 */
export default {
  number: 'hBP06-076',
  bloomEffect: {
    name: 'レッツパフォーミング',
    *run(ctx) {
      const candidates = ctx.deckCards(
        (c) => c.name === 'えびふらいおん' || c.name === 'まつりす'
      );
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: '手札に加える〈えびふらいおん〉か〈まつりす〉を選択',
        optional: true,
        skipLabel: '見つからなかったことにする',
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked, { reveal: true });
      }
      ctx.shuffleDeck();
    },
  },
  // アーツ「まつりちゃんにメロメロになれよ❤︎」の +70 は対象依存条件のため未実装（上記コメント参照）
};
