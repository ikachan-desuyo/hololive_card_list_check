/**
 * ファンミーティング (hBP03-089) サポート・イベント・LIMITED
 *
 * [サポート効果]
 *   自分のデッキから、ファン1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *
 * LIMITED：ターンに1枚しか使えない。
 *   → LIMITED の使用制限・タイミング制限はエンジンが card_type メタデータ
 *     （cards.js limited フラグ）で処理するため、ここでは記述しない。
 *
 * 実装メモ:
 *   - ファンは support かつ supportType === 'ファン' で識別（hBP03-007 等と同様）。
 *   - デッキ（非公開領域）からの検索なので「見つからなかったことにする」選択を許可する。
 *   - 公開して手札に加えた後、デッキをシャッフルする（ファンが無くてもシャッフルは行う）。
 */
const FAN_FILTER = (c) => c.kind === 'support' && c.supportType === 'ファン';

export default {
  number: 'hBP03-089',
  support: {
    canUse(ctx) {
      // デッキにファンがあること（無くても公開できないだけだが、使う意味がないので条件化）
      return ctx.player.deck.some(FAN_FILTER);
    },
    *run(ctx) {
      const cand = ctx.deckCards(FAN_FILTER);
      const picked = yield ctx.chooseCard({
        cards: cand,
        title: 'デッキからファン1枚を公開して手札に加える',
        optional: true,
        skipLabel: '見つからなかったことにする',
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked, { reveal: true });
      }
      ctx.shuffleDeck();
    },
  },
};
