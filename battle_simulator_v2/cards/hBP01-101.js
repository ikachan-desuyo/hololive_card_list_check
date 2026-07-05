/**
 * ワトソン・アメリア (hBP01-101) 無色・Spot・HP80（#EN #Myth）
 * コラボエフェクト「手がかり発見」:
 *   自分のアーカイブのアイテム1枚を手札に戻せる。（「戻せる」=任意）
 * アーツ「初歩的なことなんでしょう？」(20): テキスト効果なし。
 */
export default {
  number: 'hBP01-101',
  collabEffect: {
    name: '手がかり発見',
    *run(ctx) {
      const items = ctx.player.archive.filter(
        (c) => c.kind === 'support' && c.supportType === 'アイテム');
      if (items.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: items,
        title: 'アーカイブのアイテム1枚を手札に戻す（任意）',
        optional: true,
        skipLabel: '戻さない',
      });
      if (!picked) return;
      ctx.removeFromArchive(picked);
      ctx.addToHand(picked, { reveal: true });
    },
  },
};
