/**
 * ホロライブ言えるかな？ (hBP03-090) サポート・イベント
 *
 * [サポート効果]
 *   自分のデッキの上から4枚を見る。
 *   その中から、Debutホロメンを好きな枚数公開し、公開したホロメンを手札に加える。
 *   そして残ったカードを好きな順でデッキの下に戻す。
 *
 * 解釈:
 *   - 「好きな枚数」=0枚も可。見た4枚のうち Debut ホロメンを1枚ずつ任意選択し、
 *     これ以上選ばないと決めるまで繰り返す（チェックタイミングなし）。
 *   - 公開したカードは手札へ、残りは好きな順でデッキの下に戻す。
 */
export default {
  number: 'hBP03-090',
  support: {
    *run(ctx) {
      const looked = ctx.lookTopDeck(4);
      if (looked.length === 0) return;

      // 残り（手札に取らなかったカード）= 公開しなかった非Debut/未選択カード
      let remaining = [...looked];

      // Debut ホロメンを好きな枚数だけ手札に加える（0枚可）
      const candidates = remaining.filter(
        (c) => c.kind === 'holomen' && c.bloomLevel === 'Debut');
      const taken = yield ctx.chooseCards({
        cards: candidates,
        min: 0,
        // 選択対象外のカードも見えるように表示
        displayCards: remaining,
        title: '手札に加える Debut ホロメンを選択（選ばないと残りはデッキの下へ）',
      });
      for (const c of taken) {
        remaining = remaining.filter((x) => x !== c);
        ctx.addToHand(c, { reveal: true });
      }

      // 残ったカードを好きな順でデッキの下に戻す
      if (remaining.length > 0) {
        const ordered = yield* ctx.orderCardsFlow(remaining, 'デッキの下に戻す順番');
        ctx.deckToBottom(ordered);
      }
    },
  },
};
