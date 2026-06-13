/**
 * AZKi (hBP07-065) 紫・1st・HP190（#JP #0期生 #歌）
 * アーツ「盛り上がっていこう！」(30):
 *   自分のデッキを1枚引いた後、手札1枚をアーカイブする。
 *   → arts.run でドロー→手札1枚アーカイブ（必須・手札0でドローできなければアーカイブ対象なし）
 * アーツ「みんなの声聞かせてええええええ！！！」(120):
 *   効果テキストなし（バニラ120ダメージ）。
 */
export default {
  number: 'hBP07-065',
  arts: {
    '盛り上がっていこう！': {
      *run(ctx) {
        // 自分のデッキを1枚引く
        ctx.draw(1);
        // その後、手札1枚をアーカイブする（必須効果）
        if (ctx.player.hand.length === 0) return;
        const card = yield ctx.chooseCard({
          cards: [...ctx.player.hand],
          title: 'アーカイブする手札を1枚選択',
        });
        if (!card) return;
        ctx.removeFromHand(card);
        ctx.player.archive.push(card);
        ctx.log(`${ctx.player.name}: ${card.name} をアーカイブした`);
      },
    },
  },
};
