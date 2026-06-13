/**
 * 大神ミオ (hBP02-024) 緑・Debut・HP90（JP / ゲーマーズ / ケモミミ / 料理）
 * アーツ「うちうち、うちだよ～大神ミオだよ～」(dmg:10):
 *   自分のステージのエール1枚を、自分の#JPを持つホロメンに付け替えられる。
 *   →「できる」=任意（付け替えなくてもよい）。付け先は #JP を持つホロメンに限定。
 */
export default {
  number: 'hBP02-024',
  arts: {
    'うちうち、うちだよ～大神ミオだよ～': {
      *run(ctx) {
        // ステージ上の全エールを列挙
        const entries = [];
        for (const e of ctx.holomems('self')) {
          for (const cheer of e.holomem.cheers) entries.push({ cheer, from: e.holomem });
        }
        if (entries.length === 0) return;
        const picked = yield ctx.chooseCard({
          cards: entries.map((e) => e.cheer),
          title: '付け替えるエールを選択（任意）',
          optional: true,
          skipLabel: '付け替えない',
        });
        if (!picked) return;
        const from = entries.find((e) => e.cheer === picked).from;
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => ctx.hasTag(e.top, 'JP'),
          title: '付け替え先の #JP を持つ自分のホロメンを選択',
          optional: true,
        });
        if (!target) return;
        ctx.moveCheer(picked, from, target.holomem);
      },
    },
  },
};
