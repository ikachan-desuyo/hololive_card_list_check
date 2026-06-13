/**
 * オーロ・クロニー Debut (hBP07-051) 青・HP130（#EN #Promise）
 * コラボエフェクト「TAKE YOUR TIME」:
 *   自分のステージのエール1枚を、このホロメン以外の自分の#Promiseを持つホロメンに付け替えられる。
 * アーツ「Check This Out Yo 🕶️」(30): 効果テキストなし（バニラアーツ）。
 */
export default {
  number: 'hBP07-051',
  collabEffect: {
    name: 'TAKE YOUR TIME',
    *run(ctx) {
      const self = ctx.sourceHolomem;
      // 付け替え先候補（このホロメン以外の#Promise）が無ければ何もしない
      const dests = ctx.holomems('self', (e) => e.holomem !== self && ctx.hasTag(e.top, 'Promise'));
      if (dests.length === 0) return;
      // ステージ上の全エールを列挙
      const entries = [];
      for (const e of ctx.holomems('self')) {
        for (const cheer of e.holomem.cheers) entries.push({ cheer, from: e.holomem });
      }
      if (entries.length === 0) return;
      const ok = yield ctx.confirm('エール1枚を #Promise ホロメンに付け替えますか？');
      if (!ok) return;
      const picked = yield ctx.chooseCard({
        cards: entries.map((e) => e.cheer),
        title: '付け替えるエールを選択',
      });
      if (!picked) return;
      const from = entries.find((e) => e.cheer === picked).from;
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.holomem !== self && ctx.hasTag(e.top, 'Promise'),
        title: '付け替え先の #Promise ホロメンを選択（このホロメン以外）',
      });
      if (target) ctx.moveCheer(picked, from, target.holomem);
    },
  },
};
