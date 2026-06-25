/**
 * 秘密結社holoX (hBP02-080) サポート・イベント・LIMITED
 *
 * [サポート効果] このカードは、自分の手札がこのカードを含まずに6枚以下でなければ使えない。
 *   → 使用条件: 手札（このカードを除く）が 6 枚以下のときのみ使える。
 *
 * 効果: 自分のデッキの上から4枚を見る。その中から、#秘密結社holoX を持つホロメンを好きな枚数公開し、
 *   公開したホロメンを手札に加える。そして残ったカードを好きな順でデッキの下に戻す。
 *   ※テキスト本文は #秘密結社holox 表記だが、カードのタグ格納は「秘密結社holoX」（大文字X）。
 *
 * LIMITED：ターンに1枚しか使えない（エンジンの limited 処理で制御）。
 */
export default {
  number: 'hBP02-080',
  support: {
    canUse(ctx) {
      // このカードを含まずに手札が6枚以下でなければ使えない
      const handExcludingThis = ctx.player.hand.filter((c) => c !== ctx.sourceCard).length;
      return handExcludingThis <= 6;
    },
    *run(ctx) {
      const looked = ctx.lookTopDeck(4);
      // 「好きな枚数」#秘密結社holoX ホロメンを手札に加える（0枚も可。"好きな枚数"=0可）
      const remaining = [...looked];
      const candidates = remaining.filter(
        (c) => c.kind === 'holomen' && ctx.hasTag(c, '秘密結社holoX'));
      const picked = yield ctx.chooseCards({
        cards: candidates,
        min: 0,
        title: '手札に加える #秘密結社holoX ホロメンを選択（任意・好きな枚数）',
        displayCards: looked, // 見た4枚は対象外のカードも表示する
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
    // 手札を増やしつつ #秘密結社holoX を探せるドロー系。盤面に holoX がいるほど価値が高い
    supportValue({ engine, player }) {
      const hasHoloX = engine._stageHolomems(player).some(
        (h) => (h.stack[0].tags || []).includes('秘密結社holoX'));
      return hasHoloX ? 26 : 14;
    },
  },
};
