/**
 * 森カリオペ (hSD18-005) 紫・Debut・HP100（#EN #Myth #歌）
 *
 * コラボエフェクト「死神式ストレッチ」:
 *   自分のツールが付いているホロメンがいるなら、相手のセンターホロメンに特殊ダメージ10を与える。
 *   → 自分のステージのホロメンのいずれかにツール（supportType==='ツール'）が付いていれば、
 *     相手センターへ特殊ダメージ10（dealSpecialDamage）。条件を満たさなければ何もしない。
 *
 * アーツ「一緒に、どう？」(20):
 *   テキスト効果なし（基本ダメージのみ。エンジンが処理）。run 不要。
 *
 * 保留: なし。
 */
export default {
  number: 'hSD18-005',
  collabEffect: {
    name: '死神式ストレッチ',
    *run(ctx) {
      // 条件: 自分のツールが付いているホロメンがいるなら
      const hasTool = ctx.holomems('self').some((e) =>
        e.holomem.attachments.some((a) => a.supportType === 'ツール'));
      if (!hasTool) {
        ctx.log('「死神式ストレッチ」: 自分のツールが付いているホロメンがいないため不発');
        return;
      }
      const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
      if (!center) return;
      yield* ctx.dealSpecialDamage(center, 10);
    },
  },
};
