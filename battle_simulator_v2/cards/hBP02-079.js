/**
 * 爆発の魔法 (hBP02-079) サポート・イベント（#魔法）
 * [サポート効果]
 *   相手のセンターホロメンかコラボホロメンに特殊ダメージ20を与える。
 *   ただし、ダウンしても相手のライフは減らない。
 *   自分の#魔法を持つイベントはターンに1回しか使えない。
 *
 * 実装メモ:
 *   - 特殊ダメージ20 + noLifeOnDown は ctx.dealSpecialDamage(target, 20, {noLifeOnDown:true}) で表現。
 *     （dealSpecialDamage はダウン確定時のみ noLifeOnDown を立てる仕様）
 *   - 「自分の#魔法を持つイベントはターンに1回しか使えない」は、#魔法 イベント全体で共有する
 *     ターン1回キー（MAGIC_EVENT_KEY）で制限する。同キーを使う他の #魔法 イベントとも排他になる。
 *     canUse で既使用なら不可、run の冒頭でマークする。
 */
const MAGIC_EVENT_KEY = '#魔法イベント:ターン1回';

export default {
  number: 'hBP02-079',
  support: {
    canUse(ctx) {
      // #魔法 イベントはこのターン未使用であること
      if (ctx.oncePerTurnUsed(MAGIC_EVENT_KEY)) return false;
      // 相手のセンター/コラボが対象（最低1人いること）
      return ctx.holomems('opp', (e) => e.pos.zone === 'center' || e.pos.zone === 'collab').length > 0;
    },
    *run(ctx) {
      ctx.markOncePerTurn(MAGIC_EVENT_KEY);
      const target = yield ctx.chooseHolomem({
        side: 'opp',
        filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'collab',
        title: '特殊ダメージ20を与える相手のセンター/コラボホロメンを選択',
      });
      if (!target) return;
      ctx.dealSpecialDamage(target, 20, { noLifeOnDown: true });
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
