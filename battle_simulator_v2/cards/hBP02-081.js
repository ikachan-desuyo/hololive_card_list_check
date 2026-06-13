/**
 * ホロライブ インドネシア2期生 (hBP02-081) サポート・イベント・LIMITED
 * このカードは、自分の手札がこのカードを含まずに6枚以下でなければ使えない。
 * 自分のデッキの上から4枚を見る。その中から、#ID2期生を持つホロメンを好きな枚数公開し、
 * 公開したホロメンを手札に加える。そして残ったカードを好きな順でデッキの下に戻す。
 * LIMITED：ターンに1枚しか使えない（エンジン側で処理）。
 */
export default {
  number: 'hBP02-081',
  support: {
    canUse(ctx) {
      // このカードを含まずに手札6枚以下（=このカードを引いた後の手札が7枚以下）
      return ctx.player.hand.length - 1 <= 6;
    },
    *run(ctx) {
      const looked = ctx.lookTopDeck(4);
      const pool = [...looked];
      // #ID2期生 を持つホロメンを好きな枚数（0枚も可）公開して手札に加える
      while (true) {
        const candidates = pool.filter((c) => c.kind === 'holomen' && ctx.hasTag(c, 'ID2期生'));
        if (candidates.length === 0) break;
        const picked = yield ctx.chooseCard({
          cards: candidates,
          title: '手札に加える #ID2期生 のホロメンを選択（任意）',
          optional: true,
          skipLabel: 'これ以上加えない',
          displayCards: pool, // 見た4枚は対象外のカードも表示する
        });
        if (!picked) break;
        pool.splice(pool.indexOf(picked), 1);
        ctx.addToHand(picked);
      }
      // 残りは好きな順でデッキの下へ戻す
      const ordered = yield* ctx.orderCardsFlow(pool, 'デッキの下に戻す順番');
      ctx.deckToBottom(ordered);
      if (ordered.length > 0) ctx.log(`残り${ordered.length}枚をデッキの下に戻した`);
    },
  },
};
