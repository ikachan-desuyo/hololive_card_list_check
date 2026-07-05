/**
 * 白銀ノエル Spot (hBP01-098) 無色・HP90（#JP #3期生 #お酒）
 * コラボエフェクト「それは「俺」」:
 *   自分のアーカイブのエール1枚を自分のホロメンに送れる。（任意）
 * アーツ「ノエル～扉の向こう側へ～」(dmg:20):
 *   追加テキストなし（素のダメージのみ）。個別実装不要。
 */
export default {
  number: 'hBP01-098',
  collabEffect: {
    name: 'それは「俺」',
    *run(ctx) {
      const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
      if (cheers.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: cheers,
        title: 'アーカイブから送るエールを選択（任意）',
        optional: true,
        skipLabel: '送らない',
      });
      if (!picked) return;
      const target = yield ctx.chooseHolomem({
        side: 'self',
        title: 'エールを送るホロメンを選択',
      });
      if (!target) return;
      ctx.removeFromArchive(picked);
      ctx.attachCheer(picked, target.holomem);
    },
  },
};
