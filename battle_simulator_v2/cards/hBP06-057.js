/**
 * 森カリオペ (hBP06-057) 青・Debut・HP110（#EN #Myth #歌）
 * アーツ「Mori's Underground Live」(20):
 *   自分のデッキを1枚引いた後、手札1枚をアーカイブする。
 *   → run: draw(1) してから手札1枚を選んでアーカイブ（任意ではなく必須処理）。
 */
export default {
  number: 'hBP06-057',
  arts: {
    "Mori's Underground Live": {
      *run(ctx) {
        ctx.draw(1);
        if (ctx.player.hand.length === 0) return; // 手札が無ければアーカイブできない
        const card = yield ctx.chooseCard({
          cards: [...ctx.player.hand],
          title: 'アーカイブする手札を1枚選択',
        });
        if (!card) return;
        ctx.removeFromHand(card);
        ctx.player.archive.push(card);
        ctx.log(`${card.name} をアーカイブした`);
      },
    },
  },
};
