/**
 * アイラニ・イオフィフティーン Debut (hSD01-012)
 * コラボエフェクト「一緒にお絵かき！」:
 * 自分のアーカイブの[白エールか緑エール]1枚を自分のセンターホロメンに送れる。
 */
export default {
  number: 'hSD01-012',
  collabEffect: {
    name: '一緒にお絵かき！',
    *run(ctx) {
      if (!ctx.player.center) return;
      const candidates = ctx.player.archive.filter((c) =>
        c.kind === 'cheer' && (c.color === '白' || c.color === '緑'));
      if (candidates.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: 'センターに送るエールを選択（任意）',
        optional: true,
        skipLabel: '送らない',
      });
      if (picked) {
        ctx.removeFromArchive(picked);
        ctx.attachCheer(picked, ctx.player.center);
      }
    },
  },
};
