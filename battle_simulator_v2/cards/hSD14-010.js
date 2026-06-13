/**
 * holoAN（サポート・スタッフ・LIMITED）
 * 自分のデッキを3枚引く。
 * LIMITED：ターンに1枚しか使えない。
 *
 * LIMITED制限（ターン1枚／先攻1ターン目不可）は card_type から自動判定され、
 * エンジン側（engine.js usedLimitedThisTurn）で強制されるためここでは扱わない。
 * 保留点: なし。
 */
export default {
  number: 'hSD14-010',
  ai: {
    // 手札補充。手札が少ないほど価値が高い。
    supportValue({ engine, player }) {
      return player.deck.length > 0 ? 28 : 0;
    },
  },
  support: {
    *run(ctx) {
      ctx.draw(3);
    },
  },
};
