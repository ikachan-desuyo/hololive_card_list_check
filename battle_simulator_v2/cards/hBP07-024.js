/**
 * 大神ミオ (hBP07-024) 緑・Debut・HP130（#JP #ゲーマーズ #ケモミミ #料理）
 *
 * [ギフト] ウチの大切な家族:
 *   [ターンに1回]このホロメンに〈ミオファ〉が付いた時、自分のデッキを1枚引く。
 *   → triggers.onAttached（ホスト側の「付いた時」トリガー。engine が装着時にホスト定義の
 *     onAttached も発火する）で実装。付いたカードが〈ミオファ〉の時、[ターンに1回]デッキを1枚引く。
 *
 * [アーツ] 今日もいっぱい笑っていこう (10+):
 *   自分のデッキの上から1枚をアーカイブできる。
 *   アーカイブしたカードがサポートカードなら、このアーツ+30。
 */
export default {
  number: 'hBP07-024',
  triggers: {
    // ギフト「ウチの大切な家族」: [ターンに1回]このホロメンに〈ミオファ〉が付いた時、デッキを1枚引く
    *onAttached(ctx) {
      if (ctx.sourceCard?.name !== 'ミオファ') return;
      const host = ctx.sourceHolomem;
      if (host._mioDrewTurn === ctx.state.turn) return; // [ターンに1回]（ホロメン単位）
      host._mioDrewTurn = ctx.state.turn;
      ctx.draw(1);
    },
  },
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
