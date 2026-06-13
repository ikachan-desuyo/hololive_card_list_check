/**
 * 博衣こより (hBP04-009) 白・Debut・HP100（#JP #秘密結社holoX #ケモミミ）
 * アーツ「終わりなき輪廻に迷いし子らよ」(20 / any):
 *   自分のデッキの上から3枚を見る。その中から、
 *   [#秘密結社holoXを持つDebutホロメン か #こよラボを持つサポートカード]1枚を公開し、手札に加える。
 *   そして残ったカードを好きな順でデッキの下に戻す。
 *
 * 解釈: 候補が無い場合は何も加えず3枚を下に戻すだけ。
 *   テキストに「できる」が無いため、候補が存在する場合は必ず1枚加える（非任意）。
 * 保留: なし。
 */
export default {
  number: 'hBP04-009',
  arts: {
    '終わりなき輪廻に迷いし子らよ': {
      *run(ctx) {
        const looked = ctx.lookTopDeck(3); // 解決領域(revealed)に置かれる
        const pool = looked.slice();
        const candidates = pool.filter((c) =>
          (c.kind === 'holomen' && c.bloomLevel === 'Debut' && ctx.hasTag(c, '秘密結社holoX')) ||
          (c.kind === 'support' && ctx.hasTag(c, 'こよラボ'))
        );
        if (candidates.length > 0) {
          const picked = yield ctx.chooseCard({
            cards: candidates,
            title: '手札に加えるカードを選択（#秘密結社holoXのDebutホロメン か #こよラボのサポート）',
            displayCards: pool,
          });
          if (picked) {
            pool.splice(pool.indexOf(picked), 1);
            ctx.addToHand(picked);
          }
        }
        if (pool.length > 0) {
          const ordered = yield* ctx.orderCardsFlow(pool, 'デッキの下に戻す順番');
          ctx.deckToBottom(ordered);
        }
      },
    },
  },
};
