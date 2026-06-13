/**
 * 水宮枢 (hSD11-007) 青・Debut（#FLOW GLOW）
 * アーツ「しゅぴしゅわー」(20): 相手のセンターポジションのホロメン1人は、
 *   次の相手のターンが終了するまでバトンタッチに必要な無色エール+1。
 *   → 相手センターに、複数ターン継続(untilTurn)のバトンタッチ必要エール増加(batonCostReduce 負値)を付与。
 */
export default {
  number: 'hSD11-007',
  arts: {
    'しゅぴしゅわー': {
      *run(ctx) {
        const center = ctx.opponent.center;
        if (!center) return;
        const oppIdx = 1 - ctx.playerIdx;
        ctx.addTurnModifier({
          kind: 'batonCostReduce',
          color: '無色',
          amount: -1, // 負値＝必要エール+1
          ownerIdx: oppIdx, // 相手がバトンタッチする時に参照される
          match: (h) => h === center,
          untilTurn: ctx.state.turn + 1, // 次の相手のターンが終了するまで
          description: `${center.stack[0].name} のバトンタッチ必要無色+1（次の相手ターン終了まで）`,
        });
      },
    },
  },
};
