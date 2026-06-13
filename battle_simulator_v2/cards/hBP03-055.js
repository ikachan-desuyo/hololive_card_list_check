/**
 * 常闇トワ (hBP03-055) 紫・1st・HP130（#JP #4期生 #歌 #シューター）
 * アーツ「トワとお家デートしたっていい」(40): 効果なし（基本ダメージのみ）。
 * アーツ「てんQ」(50):
 *   自分の#歌を持つバックホロメンがいる時、相手のコラボホロメンに特殊ダメージ20を与える。
 *   → arts.run で条件判定し dealSpecialDamage(20)。
 */
export default {
  number: 'hBP03-055',
  arts: {
    'てんQ': {
      *run(ctx) {
        // 自分の#歌を持つバックホロメンがいるか
        const hasSingerBack = ctx.holomems('self',
          (e) => e.pos.zone === 'back' && ctx.hasTag(e.top, '歌')).length > 0;
        if (!hasSingerBack) return;
        // 相手のコラボホロメンに特殊ダメージ20
        const collab = ctx.holomems('opp', (e) => e.pos.zone === 'collab')[0];
        if (collab) yield* ctx.dealSpecialDamage(collab, 20);
      },
    },
  },
};
