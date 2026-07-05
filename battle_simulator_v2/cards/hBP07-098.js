/**
 * ビッグゴッドミオーンの占い (hBP07-098) サポート・イベント・LIMITED
 * [サポート効果] このカードは、自分の推しホロメンが〈大神ミオ〉でなければ使えない。
 *   自分のデッキの上から3枚を公開する。このターンの間、この能力で公開したサポートカード
 *   1枚につき、自分のステージのホロメン全員のアーツ+20。そして公開したカードを好きな順で
 *   デッキの上に戻す。
 * LIMITED：ターンに1枚しか使えない。（LIMITED制限はエンジン側で処理）
 */
export default {
  number: 'hBP07-098',
  support: {
    canUse(ctx) {
      return ctx.player.oshi?.name === '大神ミオ';
    },
    *run(ctx) {
      // デッキの上から3枚を公開（解決領域に置く）
      const revealed = ctx.lookTopDeck(3);
      for (const c of revealed) ctx.flashReveal(c);
      // 公開したサポートカードの枚数を数える
      const supportCount = revealed.filter((c) => c.kind === 'support').length;
      if (supportCount > 0) {
        const amount = supportCount * 20;
        ctx.addTurnModifier({
          kind: 'artsPlus',
          amount,
          ownerIdx: ctx.playerIdx,
          match: () => true, // 自分のステージのホロメン全員（ownerIdx で自分側に限定）
          description: `このターン、自分のステージのホロメン全員のアーツ+${amount}（公開したサポート${supportCount}枚）`,
        });
      }
      // 公開したカードを好きな順でデッキの上に戻す
      const ordered = yield* ctx.orderCardsFlow(revealed, 'デッキの上に戻す順番');
      ctx.deckToTop(ordered);
      ctx.log(`${ctx.player.name}: 公開した${revealed.length}枚をデッキの上に戻した`);
    },
  },
  ai: {
    // 自分のステージにホロメンがいて、デッキ上にサポートが含まれていそうな時に価値（簡易評価）
    supportValue({ engine, player }) {
      if (player.oshi?.name !== '大神ミオ') return 0;
      if (engine._stageCount(player) === 0) return 0;
      // デッキ全体のサポート比率からの期待値（公開3枚 × +20）
      const total = player.deck.length;
      if (total === 0) return 0;
      const supports = player.deck.filter((c) => c.kind === 'support').length;
      const expected = Math.min(3, total) * (supports / total);
      return Math.round(expected * 20);
    },
  },
};
