/**
 * さくらみこ (hBP03-029) 赤・1st・HP130（#JP #0期生 #ベイビー）
 * ブルームエフェクト「にぇ」:
 *   自分のデッキから、〈35P〉1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 * アーツ「35Pと記念写真」(30+):
 *   このホロメンに〈35P〉が付いている時、このアーツ+30。
 */
export default {
  number: 'hBP03-029',
  bloomEffect: {
    name: 'にぇ',
    *run(ctx) {
      // 〈35P〉はカード名で指定された装着/サポートカード
      const candidates = ctx.deckCards((c) => c.name === '35P');
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: 'デッキから〈35P〉1枚を公開して手札に加える',
        optional: true,
        skipLabel: '加えない',
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked, { reveal: true });
      }
      ctx.shuffleDeck();
    },
  },
  arts: {
    '35Pと記念写真': {
      dmgBonus(ctx) {
        const has35P = ctx.sourceHolomem?.attachments?.some((a) => a.name === '35P');
        return has35P ? 30 : 0;
      },
    },
  },
};
