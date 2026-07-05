/**
 * クレイジー・オリー (hBP02-049) 紫・Debut・HP60（#ID #ID2期生 #語学）
 * コラボエフェクト「オリーがいつも見てるよ」:
 *   自分のデッキを1枚引いた後、手札1枚をアーカイブする。
 * アーツ「おつクレイジー！」(20): 効果なし（素点のみ）。
 */
export default {
  number: 'hBP02-049',
  collabEffect: {
    name: 'オリーがいつも見てるよ',
    *run(ctx) {
      ctx.draw(1);
      // 引いた後、手札1枚をアーカイブ（手札が空なら何もしない）
      if (ctx.player.hand.length === 0) return;
      const card = yield ctx.chooseCard({
        cards: ctx.player.hand,
        title: 'アーカイブする手札を選択',
      });
      if (!card) return;
      ctx.removeFromHand(card);
      ctx.player.archive.push(card);
      ctx.log(`${ctx.player.name}: ${card.name} をアーカイブした`);
    },
  },
};
