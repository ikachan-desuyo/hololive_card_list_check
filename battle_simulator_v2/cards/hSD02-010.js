/**
 * 白上フブキ (hSD02-010) 無色・Spot・HP80（#JP #1期生 #ゲーマーズ #ケモミミ #絵）
 * コラボエフェクト「帰ってきなさーい」:
 *   自分のアーカイブのマスコット1枚を手札に戻せる。
 * アーツ「あやふぶみの「ふぶ」担当」(20): テキスト効果なし（ダメージのみ。エンジンが処理）。
 */
export default {
  number: 'hSD02-010',
  collabEffect: {
    name: '帰ってきなさーい',
    *run(ctx) {
      const mascots = ctx.player.archive.filter((c) => c.supportType === 'マスコット');
      if (mascots.length === 0) {
        ctx.log('アーカイブにマスコットがない');
        return;
      }
      // 「戻せる」=任意。0枚（戻さない）も可。
      const picked = yield ctx.chooseCard({
        cards: mascots,
        title: '手札に戻すマスコットを選択',
        optional: true,
        skipLabel: '戻さない',
      });
      if (!picked) return;
      ctx.removeFromArchive(picked);
      ctx.addToHand(picked);
    },
  },
};
