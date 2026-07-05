/**
 * 爆発の魔法 (hBP02-079) サポート・イベント（#魔法）
 * [サポート効果]
 *   相手のセンターホロメンかコラボホロメンに特殊ダメージ20を与える。
 *   ただし、ダウンしても相手のライフは減らない。
 *   自分の#魔法を持つイベントはターンに1回しか使えない。
 *
 * 実装メモ:
 *   - 特殊ダメージ20 + noLifeOnDown は yield* ctx.dealSpecialDamage(target, 20, {noLifeOnDown:true}) で表現。
 *     （dealSpecialDamage はダウン確定時のみ noLifeOnDown を立てる仕様）
 *   - 「自分の#魔法を持つイベントはターンに1回しか使えない」は、このターンに使った
 *     #魔法イベントの枚数（countSupportThisTurn）で制限する。魔法のタンス(hBP02-083)等
 *     他の #魔法 イベントと相互排他になる（どちらを先に使っても他方が使えなくなる）。
 */
export default {
  number: 'hBP02-079',
  support: {
    canUse(ctx) {
      // #魔法 イベントはこのターン未使用であること（タンス等と共通の数え方で相互排他）
      if (ctx.countSupportThisTurn((c) => (c.tags || []).includes('魔法') && c.supportType === 'イベント') > 0) return false;
      // 相手のセンター/コラボが対象（最低1人いること）
      return ctx.holomems('opp', (e) => e.pos.zone === 'center' || e.pos.zone === 'collab').length > 0;
    },
    *run(ctx) {
      const target = yield ctx.chooseHolomem({
        side: 'opp',
        filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'collab',
        title: '特殊ダメージ20を与える相手のセンター/コラボホロメンを選択',
      });
      if (!target) return;
      yield* ctx.dealSpecialDamage(target, 20, { noLifeOnDown: true });
    },
  },
  ai: {
    // 相手のセンター/コラボに確定20ダメージ。ターン1回の#魔法枠を消費する点も加味し中程度の価値。
    supportValue({ engine, player }) {
      const opp = engine.state.players.find((p) => p !== player);
      if (!opp) return 0;
      const targets = [opp.center, opp.collab].filter(Boolean);
      return targets.length > 0 ? 25 : 0;
    },
  },
};
