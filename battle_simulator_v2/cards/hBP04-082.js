/**
 * 夏色まつり (hBP04-082) 黄
 * ブルームエフェクト「レッツ ショッピング」:
 *   自分のステージの異なるカード名の#1期生を持つホロメン1人につき、サイコロを1回振れる：
 *   4以上が出た回数1回につき、自分のエールデッキの上から1枚をこのホロメンに送る。
 * アーツ「お気に入りみつけた」(60+):
 *   このホロメンのエール1枚につき、このアーツ+20。
 */
export default {
  number: 'hBP04-082',
  bloomEffect: {
    name: 'レッツ ショッピング',
    *run(ctx) {
      const names = new Set();
      for (const e of ctx.holomems('self', (x) => ctx.hasTag(x.top, '1期生'))) names.add(e.top.name);
      const rolls = names.size;
      if (rolls === 0 || !ctx.sourceHolomem) return;
      const ok = yield ctx.confirm(`サイコロを${rolls}回振りますか？`, '振る', '振らない');
      if (!ok) return;
      let hi = 0;
      for (let i = 0; i < rolls; i++) {
        if (ctx.rollDice() >= 4) hi++;
      }
      for (let i = 0; i < hi; i++) ctx.sendCheerFromCheerDeckTop(ctx.sourceHolomem);
    },
  },
  arts: {
    'お気に入りみつけた': {
      dmgBonus(ctx) {
        return (ctx.sourceHolomem?.cheers.length || 0) * 20;
      },
    },
  },
};
