/**
 * シオリ・ノヴェラ (hBP07-061) 青・1st・HP140（#EN #Advent）
 * ブルームエフェクト「A New Chapter Begins!」:
 *   自分の推しホロメンが〈シオリ・ノヴェラ〉なら、自分のデッキの上から4枚を見る。
 *   その中から、サポートカード1枚を公開し、手札に加える。
 *   そして残ったカードを好きな順でデッキの下に戻す。
 *   → 見た4枚は revealed（解決領域）に置き、サポートを手札へ、残りは好きな順でデッキ下へ。
 * アーツ「逃がす訳がないでしょう？」(20):
 *   相手のバックホロメン1人に特殊ダメージ20を与える。
 */
export default {
  number: 'hBP07-061',
  bloomEffect: {
    name: 'A New Chapter Begins!',
    *run(ctx) {
      // 推しホロメンが〈シオリ・ノヴェラ〉でなければ何もしない
      if (ctx.player.oshi?.name !== 'シオリ・ノヴェラ') return;
      const seen = ctx.lookTopDeck(4);
      if (seen.length === 0) return;
      const supports = seen.filter((c) => c.kind === 'support');
      if (supports.length > 0) {
        const picked = yield ctx.chooseCard({
          cards: supports,
          title: '手札に加えるサポートカード1枚を選択（任意）',
          optional: true,
          skipLabel: '加えない',
        });
        if (picked) {
          // revealed から取り除いて手札へ（公開）
          ctx.addToHand(picked, { reveal: true });
        }
      }
      // 残ったカード（手札に加えた分を除く）を好きな順でデッキの下に戻す
      const rest = ctx.player.revealed.filter((c) => seen.includes(c));
      if (rest.length > 0) {
        const ordered = yield* ctx.orderCardsFlow(rest, 'デッキの下に戻す順');
        ctx.deckToBottom(ordered || rest);
      }
    },
  },
  arts: {
    '逃がす訳がないでしょう？': {
      *run(ctx) {
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.pos.zone === 'back',
          title: '特殊ダメージ20を与える相手のバックホロメンを選択',
        });
        if (target) yield* ctx.dealSpecialDamage(target, 20);
      },
    },
  },
};
