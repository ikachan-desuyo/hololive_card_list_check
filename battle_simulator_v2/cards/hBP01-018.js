/**
 * 七詩ムメイ (hBP01-018) 白・1st・HP120（#EN #Promise #トリ #絵）
 * アーツ「思い出の欠片」(20+):
 *   自分のデッキの上から1枚を公開できる：
 *   公開したカードが#Promiseを持つ時、このアーツ+20。
 *   そして公開したカードを手札に加える。
 *
 * 「公開できる」=任意。公開した場合のみ、#Promise判定で+20し、
 * 公開したカードを（#Promiseの有無に関わらず）手札に加える。
 */
export default {
  number: 'hBP01-018',
  arts: {
    '思い出の欠片': {
      *run(ctx) {
        if (ctx.player.deck.length === 0) return;
        const ok = yield ctx.confirm('デッキの上から1枚を公開しますか？');
        if (!ok) return;
        const [card] = ctx.lookTopDeck(1);
        if (!card) return;
        if (ctx.hasTag(card, 'Promise')) {
          ctx.addArtBonus(20, '#Promiseを公開');
        }
        ctx.addToHand(card);
      },
    },
  },
};
