/**
 * ネリッサ・レイヴンクロフト (hBP02-067) 紫・1st・HP120（#EN #Advent #歌 #トリ）
 *
 * ブルームエフェクト「ネリッサとお茶会」:
 *   自分のデッキの上から3枚を見る。その中から、#歌を持つホロメン1枚を公開し、手札に加える。
 *   そして残ったカードを好きな順でデッキの下に戻す。
 *   → #歌ホロメンが見えていれば必ず1枚手札に加える（「できる」ではないため任意ではない）。
 *     候補が複数あればプレイヤーが選ぶ。0枚なら加えず、見た3枚をそのまま下に戻す。
 *
 * アーツ「コーヒーよりも紅茶です」(20): 追加効果なし（dmgのみ）。
 */
export default {
  number: 'hBP02-067',
  bloomEffect: {
    name: 'ネリッサとお茶会',
    *run(ctx) {
      const seen = ctx.lookTopDeck(3);
      if (seen.length === 0) return;
      // #歌を持つホロメンのみ手札に加えられる
      const songHolomems = seen.filter(
        (c) => c.kind === 'holomen' && ctx.hasTag(c, '歌'));
      if (songHolomems.length > 0) {
        const picked = yield ctx.chooseCard({
          cards: songHolomems,
          displayCards: seen,
          title: '手札に加える #歌 を持つホロメンを選択',
        });
        if (picked) ctx.addToHand(picked, { reveal: true });
      }
      // 残ったカードを好きな順でデッキの下に戻す
      const rest = seen.filter((c) => ctx.player.revealed.includes(c));
      if (rest.length > 0) {
        const ordered = yield* ctx.orderCardsFlow(rest, 'デッキの下に戻す順番');
        ctx.deckToBottom(ordered);
        ctx.log(`${ordered.length}枚をデッキの下に戻した`);
      }
    },
  },
};
