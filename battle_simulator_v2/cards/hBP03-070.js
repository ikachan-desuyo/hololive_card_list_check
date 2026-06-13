/**
 * 角巻わため (hBP03-070) 黄・1st・HP130（#JP #4期生 #ケモミミ #歌）
 * ブルームエフェクト「めいっぱい歌って踊ります！」:
 *   自分のステージのホロメンが5人以下の時、自分のデッキから、Debutホロメンの〈角巻わため〉1枚を
 *   公開し、ステージに出せる。そしてデッキをシャッフルする。
 * アーツ「最後まで見ててね、わためいと！」(30):
 *   自分のエールデッキの上から1枚を、自分のバックホロメンの〈角巻わため〉に送る。
 */
export default {
  number: 'hBP03-070',
  bloomEffect: {
    name: 'めいっぱい歌って踊ります！',
    *run(ctx) {
      // 「5人以下の時」= ステージに出す余地がある（上限6人）必要があるので 5 以下を条件にする
      if (ctx.engine._stageCount(ctx.player) > 5) return;
      const candidates = ctx.deckCards(
        (c) => c.name === '角巻わため' && c.bloom_level === 'Debut',
      );
      if (candidates.length === 0) return;
      const ok = yield ctx.confirm('デッキからDebutの〈角巻わため〉をステージに出しますか？');
      if (!ok) return;
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: 'ステージに出すDebutの〈角巻わため〉を選択',
        optional: true,
      });
      if (picked) {
        ctx.flashReveal(picked); // 公開
        ctx.removeFromDeck(picked);
        ctx.putToBack(picked);
      }
      ctx.shuffleDeck();
    },
  },
  arts: {
    '最後まで見ててね、わためいと！': {
      *run(ctx) {
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => e.pos.zone === 'back' && e.top.name === '角巻わため',
          title: 'エールを送るバックの〈角巻わため〉を選択',
          optional: true,
        });
        if (target) ctx.sendCheerFromCheerDeckTop(target.holomem);
      },
    },
  },
};
