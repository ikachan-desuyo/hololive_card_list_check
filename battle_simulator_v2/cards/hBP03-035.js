/**
 * 鷹嶺ルイ (hBP03-035) 赤・1st・HP240 / Buzzホロメン（#秘密結社holoX, #トリ, #お酒）
 * アーツ「challenger」(50):
 *   自分の推しホロメンが〈鷹嶺ルイ〉の時、自分の手札2枚をアーカイブできる：自分のデッキを3枚引く。
 *   → 推しホロメン名が一致し、手札が2枚以上ある場合のみ任意で実行（アーカイブ→3ドロー）
 */
export default {
  number: 'hBP03-035',
  arts: {
    'challenger': {
      *run(ctx) {
        // 推しホロメンが〈鷹嶺ルイ〉でなければ追加効果なし
        if (ctx.player.oshi?.name !== '鷹嶺ルイ') return;
        if (ctx.player.hand.length < 2) return; // コスト（手札2枚）を払えない
        const ok = yield ctx.confirm('手札2枚をアーカイブしてデッキを3枚引きますか？');
        if (!ok) return;
        const cards = yield ctx.chooseCards({
          cards: [...ctx.player.hand],
          count: 2,
          title: 'コスト: アーカイブする手札を選択（2枚）',
        });
        for (const card of cards) {
          ctx.removeFromHand(card);
          ctx.player.archive.push(card);
        }
        ctx.log('手札2枚をアーカイブした');
        ctx.draw(3);
      },
    },
  },
};
