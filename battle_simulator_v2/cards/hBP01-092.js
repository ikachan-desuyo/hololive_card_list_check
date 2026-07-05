/**
 * オーロ・クロニー (hBP01-092) 青・Debut・HP70（#EN #Promise）
 * アーツ「クロにちは～」(10):
 *   このホロメンのエール1枚を、自分の他の#Promiseを持つホロメンに付け替えられる。
 *
 * 「付け替えられる」=任意（0可）。エールはこのホロメン（sourceHolomem）から1枚選び、
 * 自分の「他の」#Promiseホロメン（このホロメン以外）へ移す。
 */
export default {
  number: 'hBP01-092',
  arts: {
    'クロにちは～': {
      *run(ctx) {
        const self = ctx.sourceHolomem;
        if (!self || !self.cheers || self.cheers.length === 0) return;

        // 付け替え先候補: 自分の、このホロメン以外の #Promise ホロメン
        const targets = ctx.holomems('self', (e) =>
          e.holomem !== self && ctx.hasTag(e.top, 'Promise'));
        if (targets.length === 0) return;

        const cheer = yield ctx.chooseCard({
          cards: self.cheers,
          title: '付け替えるエール1枚を選択（付け替えない場合はスキップ）',
          optional: true,
          skipLabel: '付け替えない',
        });
        if (!cheer) return;

        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => e.holomem !== self && ctx.hasTag(e.top, 'Promise'),
          title: 'エールの付け替え先（#Promise ホロメン）を選択',
          optional: true,
        });
        if (!target) return;

        ctx.moveCheer(cheer, self, target.holomem);
      },
    },
  },
};
