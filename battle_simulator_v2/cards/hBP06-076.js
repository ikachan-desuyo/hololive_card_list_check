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
 *   → dmgBonus で実装。dmgBonus(ctx) は ctx.artTarget（アーツの対象ホロメン）を参照できる。
 *     対象が相手の2ndホロメンで、かつこのターンにLIMITEDのイベントを使っていたなら +70。
 */
export default {
  number: 'hBP06-076',
  arts: {
    'まつりちゃんにメロメロになれよ❤︎': {
      dmgBonus(ctx) {
        const t = ctx.artTarget;
        if (!t || t.stack[0].bloomLevel !== '2nd') return 0; // 対象が相手の2ndホロメン
        // このターンに自分がLIMITEDのイベントを使っていたなら
        const usedLimitedEvent = ctx.countSupportThisTurn((c) => c.limited && c.supportType === 'イベント') > 0;
        return usedLimitedEvent ? 70 : 0;
      },
    },
  },
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
};
