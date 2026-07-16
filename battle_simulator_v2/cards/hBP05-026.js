/**
 * アキ・ローゼンタール (hBP05-026) 緑・1st・HP180
 * コラボエフェクト「トワイライトリゾート」:
 *   自分のアーカイブの〈石の斧〉1枚を、自分の〈アキ・ローゼンタール〉に付けられる。
 *   ※ツールは1人につき1枚まで (5.17.3) — 既にツールが付いているアキには付けられない。
 * アーツ「暮れなずむひととき」(50): テキスト効果なし。
 */
export default {
  number: 'hBP05-026',
  collabEffect: {
    name: 'トワイライトリゾート',
    *run(ctx) {
      const axes = ctx.player.archive.filter((c) => ctx.nameIs(c, '石の斧'));
      if (axes.length === 0) return;
      // 付け先: 〈アキ・ローゼンタール〉かつツール装着上限 (5.17.3) を満たすホロメン
      const canHost = (e) =>
        ctx.nameIs(e.top, 'アキ・ローゼンタール') && ctx.engine._canAttachSupport(e.holomem, axes[0]);
      if (ctx.holomems('self', canHost).length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: axes,
        title: '付ける〈石の斧〉を選択（任意）',
        optional: true,
        skipLabel: '付けない',
      });
      if (!picked) return;
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: canHost,
        title: '〈石の斧〉を付ける〈アキ・ローゼンタール〉を選択',
      });
      if (target) {
        ctx.removeFromArchive(picked);
        ctx.attachSupport(picked, target.holomem);
      }
    },
  },
};
