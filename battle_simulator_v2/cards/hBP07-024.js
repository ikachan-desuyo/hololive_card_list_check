/**
 * 大神ミオ (hBP07-024) 緑・Debut・HP130（#JP #ゲーマーズ #ケモミミ #料理）
 *
 * [ギフト] ウチの大切な家族:
 *   [ターンに1回]このホロメンに〈ミオファ〉が付いた時、自分のデッキを1枚引く。
 *   ※未実装。受け手ホロメン側の「（特定カードが）付いた時」トリガーが必要だが、
 *     エンジンの onAttach は付けられたカード（〈ミオファ〉側）の定義でしか誘発されず、
 *     付け先ホロメンの定義からは反応できない（ホスト側の装着反応フックが無い）。
 *
 * [アーツ] 今日もいっぱい笑っていこう (10+):
 *   自分のデッキの上から1枚をアーカイブできる。
 *   アーカイブしたカードがサポートカードなら、このアーツ+30。
 */
export default {
  number: 'hBP07-024',
  arts: {
    '今日もいっぱい笑っていこう': {
      *run(ctx) {
        if (ctx.player.deck.length === 0) return;
        const ok = yield ctx.confirm('デッキの上から1枚をアーカイブしますか？（サポートならこのアーツ+30）');
        if (!ok) return;
        // デッキの上から1枚を見て（解決領域を経由）アーカイブへ送る
        const [card] = ctx.lookTopDeck(1);
        if (!card) return;
        ctx._unreveal(card);
        ctx.player.archive.push(card);
        ctx.log(`${ctx.player.name}: ${card.name} をアーカイブした`);
        if (card.kind === 'support') {
          ctx.addArtBonus(30, 'アーカイブしたカードがサポート');
        }
      },
    },
  },
};
