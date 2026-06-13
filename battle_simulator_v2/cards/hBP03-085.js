/**
 * スーパーパソコン（サポート・アイテム・LIMITED）hBP03-085
 * [サポート効果] 自分のデッキの上から4枚を見る。その中から、Debutホロメンと1stホロメン
 *   1枚ずつを公開し、公開したホロメンを手札に加える。
 *   そして残ったカードを好きな順でデッキの下に戻す。
 * LIMITED：ターンに1枚しか使えない（LIMITED制限はエンジン側で処理）。
 *
 * 解釈: 見た4枚の中から Debutホロメン1枚・1stホロメン1枚を各1枚選んで手札へ。
 *   該当が無ければその枠は加えない（見つからなかったことにする＝0枚可）。
 *   手札に加えなかった残りは好きな順でデッキの下へ。
 */
export default {
  number: 'hBP03-085',
  ai: {
    // 山札を掘ってホロメンを補充できる汎用サーチ
    supportValue() {
      return 14;
    },
  },
  support: {
    *run(ctx) {
      const looked = ctx.lookTopDeck(4);
      const taken = [];

      // Debutホロメン1枚を公開して手札へ
      const debutCands = looked.filter(
        (c) => c.kind === 'holomen' && c.bloomLevel === 'Debut');
      if (debutCands.length > 0) {
        const picked = yield ctx.chooseCard({
          cards: debutCands,
          title: '公開して手札に加えるDebutホロメンを選択',
          optional: true,
          skipLabel: '加えない',
        });
        if (picked) {
          ctx.addToHand(picked); // revealed領域から手札へ（公開）
          taken.push(picked);
        }
      }

      // 1stホロメン1枚を公開して手札へ（既に取ったカードは除外）
      const firstCands = looked.filter(
        (c) => c.kind === 'holomen' && c.bloomLevel === '1st' && !taken.includes(c));
      if (firstCands.length > 0) {
        const picked = yield ctx.chooseCard({
          cards: firstCands,
          title: '公開して手札に加える1stホロメンを選択',
          optional: true,
          skipLabel: '加えない',
        });
        if (picked) {
          ctx.addToHand(picked);
          taken.push(picked);
        }
      }

      // 残ったカードを好きな順でデッキの下に戻す
      const rest = looked.filter((c) => !taken.includes(c));
      if (rest.length > 0) {
        const ordered = yield* ctx.orderCardsFlow(rest, '残ったカードをデッキの下に戻す順番');
        ctx.deckToBottom(ordered);
      }
    },
  },
};
