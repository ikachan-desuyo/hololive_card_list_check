/**
 * 博衣こより (hBP04-011) 白
 * アーツ「助手くんっ見ててね！」(30):
 *   自分のアーカイブの〈こよりの助手くん〉1枚を、自分の他の〈博衣こより〉に付けられる。
 */
export default {
  number: 'hBP04-011',
  arts: {
    '助手くんっ見ててね！': {
      *run(ctx) {
        const helpers = ctx.player.archive.filter((c) => c.name === 'こよりの助手くん');
        const others = ctx.holomems('self', (e) =>
          e.holomem !== ctx.sourceHolomem && e.top.name === '博衣こより');
        if (helpers.length === 0 || others.length === 0) return;
        const picked = yield ctx.chooseCard({
          cards: helpers,
          title: '付ける〈こよりの助手くん〉を選択（任意）',
          optional: true,
          skipLabel: '付けない',
        });
        if (!picked) return;
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => e.holomem !== ctx.sourceHolomem && e.top.name === '博衣こより',
          title: '付ける先の〈博衣こより〉を選択',
        });
        if (target) {
          ctx.removeFromArchive(picked);
          // アーカイブから付けるので、助手くんの「付けた時」トリガーも誘発する
          yield* ctx.attachSupportWithTrigger(picked, target.holomem);
        }
      },
    },
  },
};
