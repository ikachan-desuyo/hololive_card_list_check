/**
 * シオリ・ノヴェラ (hBP07-060) 青・1st・HP190
 * アーツ「Don't Let Her Cook!」(50): このアーツは、自分のアーカイブにサポートカードが4枚以上なければ使えない。
 *   → arts.canUse（使用条件。満たさなければパフォーマンスの選択肢に出ない）
 * アーツ「食料解剖」(10): テキスト効果なし。
 */
export default {
  number: 'hBP07-060',
  arts: {
    "Don't Let Her Cook!": {
      canUse(ctx) {
        return ctx.player.archive.filter((c) => c.kind === 'support').length >= 4;
      },
    },
  },
};
