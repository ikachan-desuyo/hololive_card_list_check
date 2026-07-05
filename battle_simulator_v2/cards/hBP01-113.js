/**
 * Promise (hBP01-113) サポート・イベント・LIMITED
 * 使用条件: このカードは、自分の手札がこのカードを含まずに6枚以下でなければ使えない。
 *   → 手札（このカード含む）の枚数 - 1 が 6 以下。
 * 効果: 自分のデッキの上から4枚を見る。その中から #Promise を持つホロメンを
 *   好きな枚数（0枚可）公開して手札に加える。残ったカードを好きな順でデッキの下に戻す。
 * LIMITED（ターンに1枚しか使えない）はエンジン側で処理。
 */
export default {
  number: 'hBP01-113',
  ai: {
    // 山札上4枚は非公開。デッキ内の #Promise ホロメン残数で大まかに価値を見積もる
    // （デッキ構成は自分の公開情報。順序は見ない設計原則に従う）
    supportValue({ player }) {
      if (player.hand.length - 1 > 6) return 0; // 使用条件を満たさない
      const hasPromiseInDeck = player.deck.some(
        (c) => c.kind === 'holomen' && (c.tags || []).includes('Promise'));
      return hasPromiseInDeck ? 26 : 8;
    },
  },
  support: {
    canUse(ctx) {
      // 「このカードを含まずに6枚以下」= 手札からこのカードを除いた枚数が6以下
      return ctx.player.hand.length - 1 <= 6;
    },
    *run(ctx) {
      const looked = ctx.lookTopDeck(4);
      if (looked.length === 0) return;

      // #Promise を持つホロメンを好きな枚数（0可）選んで手札に加える
      const remaining = [...looked];
      const candidates = remaining.filter(
        (c) => c.kind === 'holomen' && ctx.hasTag(c, 'Promise'));
      const picked = yield ctx.chooseCards({
        cards: candidates,
        min: 0, // 好きな枚数（0可）
        title: '手札に加える #Promise のホロメンを選択（好きな枚数）',
      });
      for (const c of picked) {
        remaining.splice(remaining.indexOf(c), 1);
        ctx.addToHand(c); // 公開して手札に加える
      }

      // 残ったカードを好きな順でデッキの下に戻す
      if (remaining.length > 0) {
        const ordered = yield* ctx.orderCardsFlow(remaining, 'デッキの下に戻す順番');
        ctx.deckToBottom(ordered);
        ctx.log(`${ordered.length}枚をデッキの下に戻した`);
      }
    },
  },
};
