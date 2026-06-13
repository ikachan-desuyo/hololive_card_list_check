/**
 * 大空スバル (hBP04-072) 黄
 * ブルームエフェクト「サンライトステージ」:
 *   自分のアーカイブの黄エール1枚を自分のホロメンに送れる。
 * アーツ「太陽少女」(100+):
 *   お互いのステージのエール1枚につき、このアーツ+10。ただし、数える枚数は8枚まで。
 */
export default {
  number: 'hBP04-072',
  bloomEffect: {
    name: 'サンライトステージ',
    *run(ctx) {
      const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer' && c.color === '黄');
      if (cheers.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: cheers,
        title: '送る黄エールを選択（アーカイブ・任意）',
        optional: true,
        skipLabel: '送らない',
      });
      if (!picked) return;
      const target = yield ctx.chooseHolomem({ side: 'self', title: 'エールを送るホロメンを選択' });
      if (target) {
        ctx.removeFromArchive(picked);
        ctx.attachCheer(picked, target.holomem);
      }
    },
  },
  arts: {
    '太陽少女': {
      dmgBonus(ctx) {
        let n = 0;
        for (const e of ctx.holomems('self')) n += e.holomem.cheers.length;
        for (const e of ctx.holomems('opp')) n += e.holomem.cheers.length;
        return Math.min(n, 8) * 10;
      },
    },
  },
};
