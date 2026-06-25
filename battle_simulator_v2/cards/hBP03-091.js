/**
 * ホロライブインドネシア1期生 (hBP03-091) サポート・イベント・LIMITED
 *
 * [サポート効果] このカードは、自分の手札がこのカードを含まずに6枚以下でなければ使えない。
 *   → 使用条件: 手札（このカードを除く）が 6 枚以下のときのみ使える。
 *
 * 効果: 自分のデッキの上から4枚を見る。その中から、#ID1期生を持つホロメンを好きな枚数公開し、
 *   公開したホロメンを手札に加える。そして残ったカードを好きな順でデッキの下に戻す。
 *
 * LIMITED：ターンに1枚しか使えない（エンジンの limited 処理で制御）。
 */
export default {
  number: 'hBP03-091',
  support: {
    canUse(ctx) {
      // このカードを含まずに手札が6枚以下（=このカードを除く手札枚数 <= 6）でなければ使えない
      const handExcludingThis = ctx.player.hand.filter((c) => c !== ctx.sourceCard).length;
      return handExcludingThis <= 6;
    },
    *run(ctx) {
      const looked = ctx.lookTopDeck(4);
      // 「好きな枚数」#ID1期生ホロメンを手札に加える（0枚も可。"好きな枚数"=0可）
      const remaining = [...looked];
      const candidates = remaining.filter(
        (c) => c.kind === 'holomen' && ctx.hasTag(c, 'ID1期生'));
      const picked = yield ctx.chooseCards({
        cards: candidates,
        min: 0,
        title: '手札に加える #ID1期生 ホロメンを選択（任意・好きな枚数）',
      });
      for (const c of picked) {
        remaining.splice(remaining.indexOf(c), 1);
        ctx.addToHand(c); // 公開して手札に加える
      }
      // 残ったカードを好きな順でデッキの下に戻す
      if (remaining.length > 0) {
        const ordered = yield* ctx.orderCardsFlow(remaining, 'デッキの下に戻す順番');
        ctx.deckToBottom(ordered);
      }
    },
  },
  ai: {
    // 手札を増やしつつ #ID1期生 を探せるドロー系。手札が少ない時ほど価値が高い
    supportValue({ engine, player }) {
      const hasId = engine._stageHolomems(player).some(
        (h) => (h.stack[0].tags || []).includes('ID1期生'));
      return hasId ? 26 : 14;
    },
  },
};
