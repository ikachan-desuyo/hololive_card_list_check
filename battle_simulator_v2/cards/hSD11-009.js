/**
 * 水宮枢 (hSD11-009) 青・2nd（#FLOW GLOW）
 * コラボエフェクト「感情の伝令者」: 相手のセンターホロメン1人は、
 *   次の相手のターンが終了するまでバトンタッチに必要な無色+3。
 * アーツ「スゥイートオブセッション」(100): このアーツの対象のホロメンに、
 *   そのホロメンのバトンタッチに必要な無色1つにつき、特殊ダメージ10を与える。
 */
function debuffOppCenter(ctx, amount) {
  const center = ctx.opponent.center;
  if (!center) return;
  ctx.addTurnModifier({
    kind: 'batonCostReduce', color: '無色', amount,
    ownerIdx: 1 - ctx.playerIdx,
    match: (h) => h === center,
    untilTurn: ctx.state.turn + 1,
    description: `${center.stack[0].name} のバトンタッチ必要無色+${-amount}（次の相手ターン終了まで）`,
  });
}

export default {
  number: 'hSD11-009',
  collabEffect: {
    name: '感情の伝令者',
    *run(ctx) { debuffOppCenter(ctx, -3); },
  },
  arts: {
    'スゥイートオブセッション': {
      *run(ctx) {
        const t = ctx.artTarget;
        if (!t) return;
        const oppIdx = 1 - ctx.playerIdx;
        const num = ctx.engine._effectiveBatonCost(t, t.stack[0].batonTouch || [], oppIdx)
          .filter((c) => c === '無色').length;
        if (num <= 0) return;
        const entry = ctx.holomems('opp', (e) => e.holomem === t)[0];
        if (entry) yield* ctx.dealSpecialDamage(entry, num * 10);
      },
    },
  },
};
