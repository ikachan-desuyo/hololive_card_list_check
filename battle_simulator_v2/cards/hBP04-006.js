/**
 * 大空スバル (hBP04-006) 推しホロメン・黄
 * 推しスキル「メンタル！ フィジカル！ パッション！」[ホロパワー：-2][ターンに1回]:
 *   相手のターンで、自分の〈大空スバル〉が相手からダメージを受ける時に使える：
 *   自分の〈大空スバル〉全員が受けるダメージ-30。
 *   → onDamageOshiSkill（被ダメージ割り込み）。対象が〈大空スバル〉なら受けるダメージ-30。
 *     ※アーツダメージへの割り込みのみ対応（特殊ダメージへの割り込みは未対応）。
 * SP推しスキル「リアクション芸」[ホロパワー：-2][ゲームに1回]:
 *   自分のライフが3以下の時に使える：このターンの間、自分のセンターホロメンの〈大空スバル〉のアーツ+100。
 */
export default {
  number: 'hBP04-006',
  onDamageOshiSkill: {
    cost: 2,
    sp: false,
    title: '推しスキル「メンタル！ フィジカル！ パッション！」: 受けるダメージ-30しますか？',
    canUse(engine, defIdx, target) {
      return target.stack[0].name === '大空スバル';
    },
    reduce() {
      return 30;
    },
  },
  spOshiSkill: {
    canUse(engine, ownerIdx) {
      return engine.state.players[ownerIdx].life.length <= 3;
    },
    *run(ctx) {
      const center = ctx.player.center;
      if (!center || center.stack[0].name !== '大空スバル') return;
      ctx.addTurnModifier({
        kind: 'artsPlus', amount: 100, ownerIdx: ctx.playerIdx,
        match: (h) => h === center,
        description: 'このターン、センターの〈大空スバル〉のアーツ+100',
      });
    },
  },
};
