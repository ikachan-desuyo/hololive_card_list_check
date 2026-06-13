/**
 * アキ・ローゼンタール (hBP05-026) 緑・1st・HP180
 * コラボエフェクト「トワイライトリゾート」:
 *   自分のアーカイブの〈石の斧〉1枚を、自分の〈アキ・ローゼンタール〉に付けられる。
 * アーツ「暮れなずむひととき」(50): テキスト効果なし。
 */
export default {
  number: 'hBP05-026',
  collabEffect: {
    name: 'トワイライトリゾート',
    *run(ctx) {
      const axes = ctx.player.archive.filter((c) => c.name === '石の斧');
      const akis = ctx.holomems('self', (e) => e.top.name === 'アキ・ローゼンタール');
      if (axes.length === 0 || akis.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: axes,
        title: '付ける〈石の斧〉を選択（任意）',
        optional: true,
        skipLabel: '付けない',
      });
      if (!picked) return;
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.top.name === 'アキ・ローゼンタール',
        title: '〈石の斧〉を付ける〈アキ・ローゼンタール〉を選択',
      });
      if (target) {
        ctx.removeFromArchive(picked);
        ctx.attachSupport(picked, target.holomem);
      }
    },
  },
};
