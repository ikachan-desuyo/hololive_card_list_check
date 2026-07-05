/**
 * アユンダ・リス (hBP03-078) 黄・2nd・HP190（#ID #ID1期生 #ケモミミ #歌）
 * ブルームエフェクト「マジカルサポート」:
 *   自分の#ID1期生を持つホロメンのエール1枚を、自分の他のホロメンに付け替えられる。
 * アーツ「魔法の森のリスの女の子」(50+):
 *   ・このホロメンに緑エールが付いている時、このアーツ+50。
 *   ・このホロメンに青エールが付いている時、このアーツ+50。
 *   （両方付いていれば合計+100）
 */
export default {
  number: 'hBP03-078',
  bloomEffect: {
    name: 'マジカルサポート',
    *run(ctx) {
      // #ID1期生 を持つ自分のホロメンに付いているエールを列挙（付け替え元）
      const entries = [];
      for (const e of ctx.holomems('self', (h) => ctx.hasTag(h.top, 'ID1期生'))) {
        for (const cheer of e.holomem.cheers) entries.push({ cheer, from: e.holomem });
      }
      if (entries.length === 0) return;
      const ok = yield ctx.confirm('#ID1期生のエール1枚を、他のホロメンに付け替えますか？');
      if (!ok) return;
      const picked = yield ctx.chooseCard({
        cards: entries.map((e) => e.cheer),
        title: '付け替えるエール（#ID1期生に付いている）を選択',
        optional: true,
        skipLabel: '付け替えない',
      });
      if (!picked) return;
      const from = entries.find((e) => e.cheer === picked).from;
      // 「自分の他のホロメン」= 付け替え元と異なるホロメン
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.holomem !== from,
        title: '付け替え先のホロメンを選択',
      });
      if (target) ctx.moveCheer(picked, from, target.holomem);
    },
  },
  arts: {
    '魔法の森のリスの女の子': {
      dmgBonus(ctx) {
        const cheers = ctx.sourceHolomem?.cheers || [];
        let bonus = 0;
        if (cheers.some((c) => c.color === '緑')) bonus += 50;
        if (cheers.some((c) => c.color === '青')) bonus += 50;
        return bonus;
      },
    },
  },
};
