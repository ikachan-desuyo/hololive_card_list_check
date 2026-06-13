/**
 * 尾丸ポルカ (hBP05-030) 赤・Debut・HP80（#5期生）
 * コラボエフェクト「まばゆい日常を君と」:
 *   このターンの間、自分のファンが付いているセンターホロメンのアーツ+10。
 * アーツ「うたたねの記念日」(20): テキスト効果なし。
 */
export default {
  number: 'hBP05-030',
  collabEffect: {
    name: 'まばゆい日常を君と',
    *run(ctx) {
      ctx.addTurnModifier({
        kind: 'artsPlus', amount: 10, ownerIdx: ctx.playerIdx,
        // ファンが付いているセンターホロメン（解決時に動的判定）
        match: (h) => ctx.engine._zoneOf(h) === 'center' &&
          h.attachments.some((a) => a.supportType === 'ファン'),
        description: 'このターン、ファン付きセンターのアーツ+10',
      });
    },
  },
};
