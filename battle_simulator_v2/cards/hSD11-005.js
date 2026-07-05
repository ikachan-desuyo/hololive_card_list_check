/**
 * 虎金妃笑虎 (hSD11-005) 黄・1st・HP160（#DEV_IS #FLOW #GLOW）
 * コラボエフェクト「FLOW GLOWのお笑い担当」:
 *   自分のアーカイブのエール1枚を自分の#FLOW GLOWを持つバックホロメンに送れる。
 *   → 「送れる」=任意。バックの#FLOW GLOW（FLOW+GLOW両方）ホロメンが対象。
 *     アーカイブにエールが無い／対象バックホロメンが居なければ何も起きない。
 * アーツ「百折不撓」(30+):
 *   自分のステージにエールが5枚以上あるなら、このアーツ+20。
 *   → ステージ上の全ホロメンに付いているエール総数で判定（dmgBonus で静的加算）。
 */
const isFlowGlow = (ctx, top) => ctx.hasTag(top, 'FLOW') && ctx.hasTag(top, 'GLOW');

export default {
  number: 'hSD11-005',
  collabEffect: {
    name: 'FLOW GLOWのお笑い担当',
    *run(ctx) {
      const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
      if (cheers.length === 0) return;
      const backTargets = ctx.holomems('self', (e) => e.pos.zone === 'back' && isFlowGlow(ctx, e.top));
      if (backTargets.length === 0) return;

      const cheer = yield ctx.chooseCard({
        cards: cheers,
        title: 'アーカイブから#FLOW GLOWバックホロメンに送るエールを選択（任意）',
        optional: true,
        skipLabel: '送らない',
      });
      if (!cheer) return;

      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.pos.zone === 'back' && isFlowGlow(ctx, e.top),
        title: 'エールを送る#FLOW GLOWバックホロメンを選択',
      });
      if (!target) return;

      ctx.removeFromArchive(cheer);
      ctx.attachCheer(cheer, target.holomem);
    },
  },
  arts: {
    '百折不撓': {
      dmgBonus(ctx) {
        // ステージ上の自分のエール総数
        let total = 0;
        for (const { holomem } of ctx.holomems('self')) total += holomem.cheers.length;
        return total >= 5 ? 20 : 0;
      },
    },
  },
};
