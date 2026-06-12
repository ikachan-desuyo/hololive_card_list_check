/**
 * アイラニ・イオフィフティーン Debut (hBP01-052)
 * アーツ「スラマッパギ！」:
 * 自分のステージのエール1枚を、自分の#IDを持つホロメンに付け替えられる。
 */
export default {
  number: 'hBP01-052',
  arts: {
    'スラマッパギ！': {
      *run(ctx) {
        // ステージ上の全エールを列挙
        const entries = [];
        for (const e of ctx.holomems('self')) {
          for (const cheer of e.holomem.cheers) entries.push({ cheer, from: e.holomem });
        }
        if (entries.length === 0) return;
        const ok = yield ctx.confirm('エール1枚を付け替えますか？');
        if (!ok) return;
        const picked = yield ctx.chooseCard({
          cards: entries.map((e) => e.cheer),
          title: '付け替えるエールを選択',
        });
        if (!picked) return;
        const from = entries.find((e) => e.cheer === picked).from;
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => ctx.hasTag(e.top, 'ID'),
          title: '付け替え先の #ID ホロメンを選択',
        });
        if (target) ctx.moveCheer(picked, from, target.holomem);
      },
    },
  },
};
