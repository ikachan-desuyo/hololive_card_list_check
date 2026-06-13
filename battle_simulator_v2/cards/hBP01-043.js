/**
 * 兎田ぺこら (hBP01-043) 緑・2nd・HP200（#JP #3期生 #ケモミミ）
 * ブルームエフェクト「プリンセスドレス」:
 *   このホロメンのHP50回復。
 * アーツ「全人類兎化計画」(60+):
 *   サイコロを３回振れる：出た目の合計数１につき、このアーツ+10。
 *   → 「振れる」= 任意。振るなら3回振り、合計値×10 をこのアーツに加算する。
 */
export default {
  number: 'hBP01-043',
  bloomEffect: {
    name: 'プリンセスドレス',
    *run(ctx) {
      const self = ctx.sourceHolomem;
      if (self) ctx.heal(self, 50);
    },
  },
  arts: {
    '全人類兎化計画': {
      *run(ctx) {
        const ok = yield ctx.confirm('サイコロを3回振ってこのアーツを強化しますか？');
        if (!ok) return;
        let sum = 0;
        for (let i = 0; i < 3; i++) sum += (yield* ctx.rollDice());
        ctx.addArtBonus(sum * 10, `サイコロ3回の合計${sum}×10`);
      },
    },
  },
};
