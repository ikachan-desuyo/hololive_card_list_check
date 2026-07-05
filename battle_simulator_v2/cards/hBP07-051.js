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
      // 付け替え「元」になれるホロメン＝エールを持ち、かつ「自分以外の付け替え先」が存在するもの。
      const canBeFrom = (e) => e.holomem.cheers.length > 0
        && ctx.holomems('self', (d) => isDest(d) && d.holomem !== e.holomem).length > 0;
      if (ctx.holomems('self', canBeFrom).length === 0) return; // 付け替えられるエールが無ければ何もしない
      const ok = yield ctx.confirm('エール1枚を #Promise ホロメンに付け替えますか？');
      if (!ok) return;
      // まず「元」のホロメンを盤面で選ぶ（盤上カードが光り、どのホロメンのエールか一目で分かる）
      const fromEntry = yield ctx.chooseHolomem({
        side: 'self', filter: canBeFrom, optional: true,
        title: '付け替えるエールの「元」のホロメンを選択',
      });
      if (!fromEntry) return;
      const from = fromEntry.holomem;
      const cheers = [...from.cheers];
      const picked = cheers.length === 1 ? cheers[0]
        : yield ctx.chooseCard({ cards: cheers, title: `〈${from.stack[0].name}〉の付け替えるエールを選択`, optional: true });
      if (!picked) return;
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => isDest(e) && e.holomem !== from, // このホロメン以外の#Promise、かつ元の所有者とは別
        title: '付け替え先の #Promise ホロメンを選択（このホロメン以外）',
      });
      if (target) ctx.moveCheer(picked, from, target.holomem);
    },
  },
};
