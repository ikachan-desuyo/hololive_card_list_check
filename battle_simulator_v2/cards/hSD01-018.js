/**
 * サブパソコン (hSD01-018) サポート・アイテム
 *
 * [サポート効果] 自分のデッキの上から5枚を見る。その中から、LIMITEDのサポートカード1枚を
 *   公開し、手札に加える。そして残ったカードを好きな順でデッキの下に戻す。
 *   → デッキ上5枚を解決領域(revealed)に置き、その中の LIMITED サポート(c.kind==='support' && c.limited)
 *     を1枚選んで手札に加える（該当が無い／加えなくてもよいので optional）。
 *     残りは orderCardsFlow でプレイヤーが順番を決めてデッキの下へ戻す。
 *
 * 注: LIMITED ではないサポートやホロメン等は手札に加えられない。
 */
export default {
  number: 'hSD01-018',
  ai: {
    supportValue({ player }) {
      // デッキ上5枚にLIMITEDサポートがあれば手札補充の価値
      const top5 = player.deck.slice(0, 5);
      const hit = top5.some((c) => c.kind === 'support' && c.limited);
      return hit ? 20 : 6;
    },
  },
  support: {
    *run(ctx) {
      const looked = ctx.lookTopDeck(5);
      const candidates = looked.filter((c) => c.kind === 'support' && c.limited);
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: '手札に加えるLIMITEDのサポートカードを選択',
        displayCards: looked,
        optional: true,
        skipLabel: '加えない',
      });
      let rest = looked;
      if (picked) {
        ctx.addToHand(picked, { reveal: true });
        rest = looked.filter((c) => c !== picked);
      }
      // 残ったカードを好きな順でデッキの下に戻す
      const ordered = yield* ctx.orderCardsFlow(rest, 'デッキの下に戻す順番');
      ctx.deckToBottom(ordered);
    },
  },
};
