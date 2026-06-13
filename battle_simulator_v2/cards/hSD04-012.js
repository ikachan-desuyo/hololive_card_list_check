/**
 * スバちょこルーナ（サポート・イベント・LIMITED）hSD04-012
 * [サポート効果] このカードは、自分の手札がこのカードを含まずに6枚以下でなければ使えない。
 *   自分のデッキの上から4枚を見る。その中から、〈大空スバル〉〈癒月ちょこ〉〈姫森ルーナ〉を
 *   好きな枚数公開し、公開したホロメンを手札に加える。
 *   そして残ったカードを好きな順でデッキの下に戻す。
 * LIMITED：ターンに1枚しか使えない。（LIMITED制限はエンジン側で処理）
 *
 * 実装は hSD03-012（泥棒建設）と同型。対象ホロメン名のみ異なる。
 */
const TARGET_NAMES = ['大空スバル', '癒月ちょこ', '姫森ルーナ'];

export default {
  number: 'hSD04-012',
  support: {
    canUse(ctx) {
      // このカードを含まずに手札6枚以下（＝このカード込みで7枚以下）
      return ctx.player.hand.length - 1 <= 6;
    },
    *run(ctx) {
      const looked = ctx.lookTopDeck(4);
      const pool = [...looked];
      while (true) {
        const candidates = pool.filter((c) => c.kind === 'holomen' && TARGET_NAMES.includes(c.name));
        if (candidates.length === 0) break;
        const picked = yield ctx.chooseCard({
          cards: candidates,
          title: '手札に加えるホロメンを選択（任意）',
          optional: true,
          skipLabel: 'これ以上加えない',
          displayCards: pool, // 見た4枚は対象外のカードも表示する
        });
        if (!picked) break;
        pool.splice(pool.indexOf(picked), 1);
        ctx.addToHand(picked);
      }
      // 残りは好きな順でデッキの下へ
      const ordered = yield* ctx.orderCardsFlow(pool, 'デッキの下に戻す順番');
      ctx.deckToBottom(ordered);
      if (ordered.length > 0) ctx.log(`残り${ordered.length}枚をデッキの下に戻した`);
    },
  },
};
