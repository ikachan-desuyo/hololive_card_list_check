/**
 * 古石ビジュー (hBP04-065) 紫
 * ブルームエフェクト「絶世の輝き」:
 *   自分のホロメンの赤エール1枚をアーカイブできる：自分のデッキを2枚引く。
 * アーツ「鉱石と採掘者」(30+):
 *   自分のアーカイブに赤エールがある時、このアーツ+20。
 */
export default {
  number: 'hBP04-065',
  bloomEffect: {
    name: '絶世の輝き',
    *run(ctx) {
      const havers = ctx.holomems('self', (e) => e.holomem.cheers.some((c) => c.color === '赤'));
      if (havers.length === 0) return;
      const ok = yield ctx.confirm('赤エール1枚をアーカイブして2枚引きますか？');
      if (!ok) return;
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.holomem.cheers.some((c) => c.color === '赤'),
        title: '赤エールをアーカイブするホロメンを選択',
      });
      if (!target) return;
      const reds = target.holomem.cheers.filter((c) => c.color === '赤');
      const cheer = yield ctx.chooseCard({ cards: reds, title: 'アーカイブする赤エールを選択' });
      if (!cheer) return;
      ctx.archiveCheer(target.holomem, cheer);
      ctx.draw(2);
    },
  },
  arts: {
    '鉱石と採掘者': {
      dmgBonus(ctx) {
        return ctx.player.archive.some((c) => c.kind === 'cheer' && c.color === '赤') ? 20 : 0;
      },
    },
  },
};
