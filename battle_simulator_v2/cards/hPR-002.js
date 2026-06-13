/**
 * ReGLOSS (hPR-002) サポート・イベント・LIMITED
 *
 * [サポート効果] このカードは、自分の手札がこのカードを含まずに6枚以下でなければ使えない。
 *   → 使用条件: 手札（このカードを除く）が 6 枚以下のときのみ使える。
 *
 * 効果: 自分のデッキの上から4枚を見る。その中から、#ReGLOSS を持つホロメンを好きな枚数公開し、
 *   公開したホロメンを手札に加える。そして残ったカードを好きな順でデッキの下に戻す。
 *   ※「#ReGLOSS を持つ」= タグ「ReGLOSS」を持つホロメン（card_data 上ではタグ "ReGLOSS"）。
 *   ※「好きな枚数」=0 枚も可。
 *
 * LIMITED：ターンに1枚しか使えない（エンジンの limited 処理で制御）。
 *
 * 保留: なし（hSD10-012 と同型の効果。タグが #ReGLOSS な点のみ異なる）。
 */
export default {
  number: 'hPR-002',
  support: {
    canUse(ctx) {
      // このカードを含まずに手札が6枚以下でなければ使えない
      const handExcludingThis = ctx.player.hand.filter((c) => c !== ctx.sourceCard).length;
      return handExcludingThis <= 6;
    },
    *run(ctx) {
      const looked = ctx.lookTopDeck(4);
      const remaining = [...looked];
      const isReglossHolomem = (c) => c.kind === 'holomen' && ctx.hasTag(c, 'ReGLOSS');
      // 「好きな枚数」#ReGLOSS ホロメンを公開して手札に加える（0枚も可）
      while (true) {
        const candidates = remaining.filter(isReglossHolomem);
        if (candidates.length === 0) break;
        const picked = yield ctx.chooseCard({
          cards: candidates,
          title: '手札に加える #ReGLOSS ホロメンを選択（任意・好きな枚数）',
          optional: true,
          skipLabel: 'これ以上加えない',
          displayCards: looked, // 見た4枚は対象外のカードも表示する
        });
        if (!picked) break;
        remaining.splice(remaining.indexOf(picked), 1);
        ctx.addToHand(picked); // 公開して手札に加える
      }
      // 残ったカードを好きな順でデッキの下に戻す
      if (remaining.length > 0) {
        const ordered = yield* ctx.orderCardsFlow(remaining, 'デッキの下に戻す順番');
        ctx.deckToBottom(ordered);
      }
    },
  },
  ai: {
    // 手札を増やしつつ #ReGLOSS を探せるドロー系。盤面に ReGLOSS がいるほど価値が高い
    supportValue({ engine, player }) {
      const hasRegloss = engine._stageHolomems(player).some((h) =>
        (h.stack[0].tags || []).includes('ReGLOSS'));
      return hasRegloss ? 26 : 14;
    },
  },
};
