/**
 * ホロライブ0期生 (hBP03-092) サポート・イベント・LIMITED
 * このカードは、自分の手札がこのカードを含まずに6枚以下でなければ使えない。
 * 自分のデッキの上から4枚を見る。その中から、#0期生を持つホロメンを好きな枚数公開し、
 * 公開したホロメンを手札に加える。そして残ったカードを好きな順でデッキの下に戻す。
 * LIMITED：ターンに1枚しか使えない。
 *
 * 実装メモ: hBP04-096(Advent) と同型。タグが #0期生 になっただけ。
 *   - 手札条件は「このカードを含まずに6枚以下」= 使用宣言時の手札（このカード込み）から1を引いて <=6。
 *   - LIMITED（ターンに1枚）はエンジン側のサポート種別処理で制御。
 */
export default {
  number: 'hBP03-092',
  support: {
    canUse(ctx) {
      return ctx.player.hand.length - 1 <= 6;
    },
    *run(ctx) {
      const looked = ctx.lookTopDeck(4);
      const pool = [...looked];
      while (true) {
        const candidates = pool.filter((c) => c.kind === 'holomen' && ctx.hasTag(c, '0期生'));
        if (candidates.length === 0) break;
        const picked = yield ctx.chooseCard({
          cards: candidates,
          title: '手札に加える #0期生 のホロメンを選択（任意）',
          optional: true,
          skipLabel: 'これ以上加えない',
          displayCards: pool,
        });
        if (!picked) break;
        pool.splice(pool.indexOf(picked), 1);
        ctx.addToHand(picked);
      }
      const ordered = yield* ctx.orderCardsFlow(pool, 'デッキの下に戻す順番');
      ctx.deckToBottom(ordered);
      if (ordered.length > 0) ctx.log(`残り${ordered.length}枚をデッキの下に戻した`);
    },
  },
};
