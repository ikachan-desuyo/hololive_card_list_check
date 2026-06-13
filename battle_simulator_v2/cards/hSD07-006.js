/**
 * 不知火フレア (hSD07-006) 黄・1st・HP120（#JP #3期生 #ハーフエルフ）
 * ブルームエフェクト「エルフレンドのさえずり」:
 *   自分のデッキから、〈エルフレンド〉1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   ※〈エルフレンド〉= カード名「エルフレンド」を指す（山札からの名前指定サーチ）。
 * アーツ「キミを1番好きなのはわたしぃ～♡」(30+):
 *   自分のライフが3以下の時、このアーツ+30。
 *   ※ライフ枚数 (ctx.player.life.length) が3以下で判定（text-compiler の「ライフがN以下」と同じ）。
 */
export default {
  number: 'hSD07-006',
  bloomEffect: {
    name: 'エルフレンドのさえずり',
    *run(ctx) {
      const cand = ctx.deckCards((c) => c.name === 'エルフレンド');
      const picked = yield ctx.chooseCard({
        cards: cand,
        title: '手札に加える〈エルフレンド〉を選択（任意）',
        optional: true,
        skipLabel: '見つからなかったことにする',
      });
      if (picked) { ctx.removeFromDeck(picked); ctx.addToHand(picked); }
      ctx.shuffleDeck();
    },
  },
  arts: {
    'キミを1番好きなのはわたしぃ～♡': {
      dmgBonus(ctx) {
        return ctx.player.life.length <= 3 ? 30 : 0;
      },
    },
  },
};
