/**
 * 雪花ラミィ Debut (hBP04-044)
 * コラボエフェクト「Snow flower」:
 * 自分の〈雪民〉が付いている〈雪花ラミィ〉がいない時、自分のデッキから、
 * 〈雪民〉1枚を公開し、自分の〈雪花ラミィ〉に付ける。そしてデッキをシャッフルする。
 */
function hasYukiminLamy(ctx) {
  return ctx.holomems('self', ({ top, holomem }) =>
    top.name === '雪花ラミィ' && holomem.attachments.some((a) => a.name === '雪民')
  ).length > 0;
}

export default {
  number: 'hBP04-044',
  collabEffect: {
    name: 'Snow flower',
    *run(ctx) {
      if (hasYukiminLamy(ctx)) {
        ctx.log('〈雪民〉が付いている〈雪花ラミィ〉がいるため発動しない');
        return;
      }
      const candidates = ctx.deckCards((c) => c.name === '雪民');
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: 'デッキから付ける〈雪民〉を選択',
        optional: true,
        skipLabel: '見つからなかったことにする',
      });
      if (picked) {
        const lamy = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => e.top.name === '雪花ラミィ',
          title: '〈雪民〉を付ける〈雪花ラミィ〉を選択',
        });
        if (lamy) {
          ctx.removeFromDeck(picked);
          ctx.attachSupport(picked, lamy.holomem);
        }
      }
      ctx.shuffleDeck();
    },
  },
};
