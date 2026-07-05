/**
 * 水宮枢 (hBP08-004) 推しホロメン・青 ライフ5
 *
 * 推しスキル「すうだけ見てたらいいのにね」[ホロパワー：-1][ターンに1回]:
 *   相手のセンターホロメンを選ぶ。次の相手のターンが終了するまで、
 *   選んだホロメンのバトンタッチに必要な無色+3。
 *   → oshiSkill（能動）。相手センターを対象に batonCostReduce（無色 amount:-3＝必要エール増）の
 *     ターン修正を、次の相手のターン終了まで（untilTurn = state.turn+1）積む。
 *     対象はそのホロメン個体に固定（match で同一参照を判定）。
 *
 * SP推しスキル「いけいけどんどん！」[ホロパワー：-2][ゲームに1回]:
 *   相手のバックホロメン1人に、相手のセンターホロメンが受けているダメージと
 *   同じ数値の特殊ダメージを与える。
 *   → spOshiSkill（能動）。ダメージ量 = 相手センターの damage（受けているダメージ）。
 *     相手バックが1人以上いて、かつセンターがダメージを受けている（>0）時のみ意味がある。
 *     対象のバックは選択（chooseHolomem side:'opp'）。
 *
 * 保留: なし
 */
import { COLORLESS } from '../core/constants.js';

export default {
  number: 'hBP08-004',
  oshiSkill: {
    name: 'すうだけ見てたらいいのにね',
    canUse(engine, ownerIdx) {
      const opp = engine.state.players[1 - ownerIdx];
      return !!opp.center; // 縛る相手のセンターがいること
    },
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'opp',
        filter: (e) => e.pos.zone === 'center',
        title: 'バトンタッチに必要な無色+3にする相手センターを選択',
      });
      if (!entry) return;
      const target = entry.holomem;
      const oppIdx = 1 - ctx.playerIdx;
      ctx.engine.state.modifiers.push({
        kind: 'batonCostReduce',
        ownerIdx: oppIdx,
        color: COLORLESS,
        amount: -3, // 必要エール増（無色+3）
        match: (h) => h === target,
        untilTurn: ctx.state.turn + 1, // 次の相手のターンが終了するまで
        description: `${target.stack[0].name} のバトンタッチに必要な無色+3`,
      });
      ctx.log(`すうだけ見てたらいいのにね: ${target.stack[0].name} のバトンタッチに必要な無色+3（次の相手のターン終了まで）`);
    },
  },
  spOshiSkill: {
    name: 'いけいけどんどん！',
    canUse(engine, ownerIdx) {
      const opp = engine.state.players[1 - ownerIdx];
      // 相手センターがダメージを受けていて、相手バックがいる時のみ意味がある
      if (!opp.center || opp.center.damage <= 0) return false;
      return opp.back.length > 0;
    },
    *run(ctx) {
      const opp = ctx.opponent;
      if (!opp.center) return;
      const amount = opp.center.damage; // 相手センターが受けているダメージ
      if (amount <= 0) return;
      const entry = yield ctx.chooseHolomem({
        side: 'opp',
        filter: (e) => e.pos.zone === 'back',
        title: `特殊ダメージ${amount}を与える相手バックホロメンを選択`,
      });
      if (!entry) return;
      yield* ctx.dealSpecialDamage(entry, amount);
    },
  },
};
