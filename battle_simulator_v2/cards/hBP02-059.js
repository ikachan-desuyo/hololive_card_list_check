/**
 * 森カリオペ (hBP02-059) 紫・2nd・HP200（#EN #Myth #歌）
 *
 * [キーワード/ブルームエフェクト] Soul Voice:
 *   自分のデッキから、カード1枚を公開し、アーカイブする。そしてデッキをシャッフルする。
 *   → 「デッキから、〜公開し」の定型サーチ書式（だから直後にシャッフルがある）。
 *     プレイヤーがデッキから任意の1枚を選んで公開しアーカイブする（同型: hBP06-066）。
 *
 * [アーツ] Featuring Myth (80+, 紫紫無 / 特攻 青+50):
 *   自分のアーカイブに#Mythを持つホロメンが4枚以上ある時、このアーツ+40。
 *   8枚以上ある時、さらに、このアーツ+40。（合計+80）
 */
export default {
  number: 'hBP02-059',
  bloomEffect: {
    name: 'Soul Voice',
    *run(ctx) {
      if (ctx.player.deck.length === 0) return;
      // デッキからカード1枚を選んで公開しアーカイブ（サーチ）→シャッフル
      const picked = yield ctx.chooseCard({
        cards: ctx.deckCards(() => true),
        title: 'デッキから公開してアーカイブするカードを選択',
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.flashReveal(picked);
        ctx.player.archive.push(picked);
        ctx.log(`${ctx.player.name}: ${picked.name} を公開しアーカイブした`);
        ctx.recordDeckArchive(1);
      }
      ctx.shuffleDeck();
    },
  },
  arts: {
    'Featuring Myth': {
      dmgBonus(ctx) {
        const mythInArchive = ctx.player.archive.filter(
          (c) => c.kind === 'holomen' && ctx.hasTag(c, 'Myth'),
        ).length;
        let bonus = 0;
        if (mythInArchive >= 4) bonus += 40;
        if (mythInArchive >= 8) bonus += 40;
        return bonus;
      },
    },
  },
};
