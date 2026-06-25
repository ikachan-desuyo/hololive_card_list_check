/**
 * ハコス・ベールズ (hBP06-042) 赤・1st・HP160（#EN #Promise #ケモミミ）
 * ブルームエフェクト「Strawberry Princess」:
 *   自分の手札1枚をアーカイブする。その後、自分のデッキを1枚引く。
 * アーツ「イチゴで彩る誕生日」(40+):
 *   自分の手札2枚をアーカイブできる：このアーツ+20。
 */
export default {
  number: 'hBP06-042',
  bloomEffect: {
    name: 'Strawberry Princess',
    *run(ctx) {
      if (ctx.player.hand.length > 0) {
        const card = yield ctx.chooseCard({
          cards: ctx.player.hand,
          title: 'アーカイブする手札を選択',
        });
        if (card) {
          ctx.removeFromHand(card);
          ctx.player.archive.push(card);
          ctx.log(`${card.name} をアーカイブした`);
        }
      }
      ctx.draw(1);
    },
  },
  arts: {
    'イチゴで彩る誕生日': {
      *run(ctx) {
        // 手札2枚を要する（2枚未満なら支払えない）
        if (ctx.player.hand.length < 2) return;
        const ok = yield ctx.confirm('手札2枚をアーカイブしてこのアーツ+20しますか？');
        if (!ok) return;
        const archived = yield ctx.chooseCards({
          cards: [...ctx.player.hand],
          count: 2,
          title: 'アーカイブする手札を選択',
        });
        for (const card of archived) {
          ctx.removeFromHand(card);
          ctx.player.archive.push(card);
          ctx.log(`${card.name} をアーカイブした`);
        }
        // 2枚揃った場合のみ+20（コストが揃わなければ加算しない）
        if (archived.length === 2) ctx.addArtBonus(20, '手札2枚をアーカイブ');
      },
    },
  },
};
