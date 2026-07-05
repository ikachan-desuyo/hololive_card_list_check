/**
 * 森カリオペ (hBP06-058) 青・1st・HP160（#EN #Myth #歌）
 * コラボエフェクト「Yes, Chef.」:
 *   自分のデッキを3枚引いた後、手札2枚をアーカイブする。
 * アーツ「a chef’s journey’s end.」(30):
 *   このホロメンに紫エールが付いているなら、自分のデッキを1枚引く。
 *   その後、自分のデッキの上から2枚をアーカイブする。
 */
export default {
  number: 'hBP06-058',
  collabEffect: {
    name: 'Yes, Chef.',
    *run(ctx) {
      ctx.draw(3);
      // 手札2枚をアーカイブ（強制。手札が足りなければある分だけ）。一括選択
      const picked = yield ctx.chooseCards({
        cards: [...ctx.player.hand],
        count: 2,
        title: 'アーカイブする手札を選択（2枚）',
      });
      for (const card of picked) {
        ctx.removeFromHand(card);
        ctx.player.archive.push(card);
        ctx.log(`${card.name} をアーカイブした`);
      }
    },
  },
  arts: {
    'a chef’s journey’s end.': {
      *run(ctx) {
        // 紫エールが付いているなら 1ドロー → その後デッキ上2枚をアーカイブ
        const hasPurple = ctx.sourceHolomem.cheers.some((c) => c.color === '紫');
        if (!hasPurple) return;
        ctx.draw(1);
        const cards = ctx.lookTopDeck(2);
        for (const c of cards) {
          ctx._unreveal(c);
          ctx.player.archive.push(c);
          ctx.log(`デッキの上から ${c.name} をアーカイブ`);
        }
        ctx.recordDeckArchive(cards.length);
      },
    },
  },
};
