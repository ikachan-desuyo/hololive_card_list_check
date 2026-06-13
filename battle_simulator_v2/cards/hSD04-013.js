/**
 * ちょこのオムライス (hSD04-013) サポート・イベント（#食べ物）
 * [サポート効果] 自分のホロメン1人を選ぶ。選んだホロメンのHP20回復。
 *   自分のステージに#料理を持つホロメンがいる時、さらに、
 *   このターンの間、選んだホロメンのアーツ+20。
 */
export default {
  number: 'hSD04-013',
  ai: {
    supportValue({ engine, player }) {
      // 回復対象がいて、かつダメージを負っているなら価値が上がる
      const stage = engine._stageHolomems(player);
      const hasDamaged = stage.some((h) => h.damage > 0);
      const hasCooking = stage.some((h) => (h.stack?.[0]?.tags || []).includes('料理'));
      return (hasDamaged ? 22 : 8) + (hasCooking ? 8 : 0);
    },
  },
  support: {
    canUse(ctx) {
      // ステージに自分のホロメンがいれば使用可能
      return ctx.holomems('self').length > 0;
    },
    *run(ctx) {
      const target = yield ctx.chooseHolomem({
        side: 'self',
        title: 'HP20回復するホロメンを選択',
      });
      if (!target) return;
      const chosen = target.holomem;
      ctx.heal(chosen, 20);

      // 自分のステージに #料理 を持つホロメンがいるか
      const hasCooking = ctx.holomems('self', (e) => ctx.hasTag(e.top, '料理')).length > 0;
      if (hasCooking) {
        ctx.addTurnModifier({
          kind: 'artsPlus',
          amount: 20,
          ownerIdx: ctx.playerIdx,
          match: (h) => h === chosen,
          description: `このターン、${chosen.stack[0].name} のアーツ+20`,
        });
      }
    },
  },
};
