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
      // 付け替え先になりうる「このホロメン以外の#Promise」ホロメン
      const isDest = (e) => e.holomem !== self && ctx.hasTag(e.top, 'Promise');
      // 付け替え可能なエール＝「そのエールの所有者(from)とは別の」付け替え先が存在するエールだけを候補にする。
      // （付け替え＝別のホロメンへ移すこと。所有者自身へは送れない＝no-op を作らない）
      const entries = [];
      for (const e of ctx.holomems('self')) {
        const hasOtherDest = ctx.holomems('self', (d) => isDest(d) && d.holomem !== e.holomem).length > 0;
        if (!hasOtherDest) continue;
        for (const cheer of e.holomem.cheers) entries.push({ cheer, from: e.holomem });
      }
      if (entries.length === 0) return; // 付け替えられるエールが無ければ何もしない
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
        filter: (e) => isDest(e) && e.holomem !== from, // このホロメン以外の#Promise、かつ元の所有者とは別
        title: '付け替え先の #Promise ホロメンを選択（このホロメン以外）',
      });
      if (target) ctx.moveCheer(picked, from, target.holomem);
    },
  },
};
