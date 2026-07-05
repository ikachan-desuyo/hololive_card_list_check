/**
 * 響咲リオナ (hBP06-019) 白・1st・HP150（#DEV_IS #FLOW #GLOW）
 * ブルームエフェクト「ストイック負けず嫌い王」:
 *   自分の推しホロメンが〈響咲リオナ〉なら、自分のデッキの上から1枚をアーカイブできる：自分のデッキを1枚引く。
 *   → 推しホロメン名が〈響咲リオナ〉のときのみ。コスト（デッキ上1枚アーカイブ）は任意（「できる」）。
 * アーツ「意外と熱血タイプ？」(40): 自分のデッキの上から1枚をアーカイブする（強制）。
 */
export default {
  number: 'hBP06-019',
  bloomEffect: {
    name: 'ストイック負けず嫌い王',
    *run(ctx) {
      if (ctx.player.oshi?.name !== '響咲リオナ') return;
      if (ctx.player.deck.length === 0) return;
      const ok = yield ctx.confirm('デッキの上から1枚をアーカイブして1枚引きますか？', 'する', 'やめる');
      if (!ok) return;
      ctx.player.archive.push(ctx.player.deck.shift());
      ctx.recordDeckArchive(1);
      ctx.log('デッキの上から1枚をアーカイブした');
      ctx.draw(1);
    },
  },
  arts: {
    '意外と熱血タイプ？': {
      *run(ctx) {
        if (ctx.player.deck.length === 0) return;
        ctx.player.archive.push(ctx.player.deck.shift());
        ctx.recordDeckArchive(1);
        ctx.log('デッキの上から1枚をアーカイブした');
      },
    },
  },
};
