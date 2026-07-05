/**
 * ラオーラ・パンテーラ (hBP06-013) 白・1st・Buzzホロメン・HP250（#EN #Justice #ケモミミ #絵）
 * ブルームエフェクト「CATCH ALL CHATTINI AROUND THE WORLD!!!」:
 *   自分のデッキから〈Chattino〉1枚を公開し手札に加える。そしてデッキをシャッフルする。
 * アーツ「一緒に世界を征服しよう！」(30):
 *   [センターポジション限定]このターンの間、自分の#絵を持つコラボホロメンのアーツ+20。
 *
 * ※〈Chattino〉はカード名指定。名前に "Chattino" を含むカードを検索対象とする。
 */
export default {
  number: 'hBP06-013',
  bloomEffect: {
    name: 'CATCH ALL CHATTINI AROUND THE WORLD!!!',
    *run(ctx) {
      const candidates = ctx.deckCards((c) => (c.name || '').includes('Chattino'));
      if (candidates.length === 0) {
        // デッキに〈Chattino〉が無くてもシャッフルは行う
        ctx.shuffleDeck();
        return;
      }
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: '手札に加える〈Chattino〉を選択',
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
    '一緒に世界を征服しよう！': {
      *run(ctx) {
        // センターポジション限定
        if (ctx.engine._zoneOf(ctx.sourceHolomem) !== 'center') return;
        // このターンの間、自分の#絵を持つコラボホロメンのアーツ+20
        ctx.addTurnModifier({
          kind: 'artsPlus',
          amount: 20,
          ownerIdx: ctx.playerIdx,
          match: (h) => ctx.engine._zoneOf(h) === 'collab' && (h.stack[0].tags || []).includes('絵'),
          description: 'このターン、#絵を持つコラボホロメンのアーツ+20',
        });
      },
    },
  },
};
