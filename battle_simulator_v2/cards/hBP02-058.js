/**
 * 森カリオペ 1st (hBP02-058) 紫・1st・HP140（#EN #Myth #歌）
 * ブルームエフェクト「What's up?」:
 *   自分のアーカイブの[〈森カリオペの鎌〉か〈Death-sensei〉]1枚を手札に戻せる。（「戻せる」=任意）
 * アーツ「Dead Beat」(30+):
 *   このホロメンにツールかマスコットが付いている時、このアーツ+30。
 */
export default {
  number: 'hBP02-058',
  bloomEffect: {
    name: "What's up?",
    *run(ctx) {
      const candidates = ctx.player.archive.filter(
        (c) => c.name === '森カリオペの鎌' || c.name === 'Death-sensei');
      if (candidates.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: '手札に戻すカードを選択（森カリオペの鎌 か Death-sensei）',
        optional: true,
        skipLabel: '戻さない',
      });
      if (!picked) return;
      ctx.removeFromArchive(picked);
      ctx.addToHand(picked);
    },
  },
  arts: {
    'Dead Beat': {
      dmgBonus(ctx) {
        const has = ctx.sourceHolomem?.attachments.some(
          (a) => a.supportType === 'ツール' || a.supportType === 'マスコット');
        return has ? 30 : 0;
      },
    },
  },
};
