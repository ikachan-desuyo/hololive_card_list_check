/**
 * 大神ミオ (hBP02-027) 緑・1st・Buzzホロメン・HP240（#JP #ゲーマーズ #ケモミミ #料理）
 * アーツ「タロットの導き」(60+):
 *   自分のデッキの上から1枚をアーカイブできる：
 *   アーカイブしたカードが、ホロメンの時、このアーツ+20。
 *   サポートカードの時、このアーツ+50。
 *   （エール等はデッキに入らないため、ホロメン/サポート以外なら+0）
 */
export default {
  number: 'hBP02-027',
  arts: {
    'タロットの導き': {
      *run(ctx) {
        if (ctx.player.deck.length === 0) return;
        const ok = yield ctx.confirm('デッキの上から1枚をアーカイブしてこのアーツを強化しますか？');
        if (!ok) return;
        const top = ctx.player.deck[0];
        ctx.removeFromDeck(top);
        ctx.player.archive.push(top);
        ctx.log(`${ctx.player.name}: デッキの上の ${top.name} をアーカイブ`);
        if (top.kind === 'holomen') {
          ctx.addArtBonus(20, 'アーカイブしたカードがホロメン');
        } else if (top.kind === 'support') {
          ctx.addArtBonus(50, 'アーカイブしたカードがサポートカード');
        }
      },
    },
  },
};
