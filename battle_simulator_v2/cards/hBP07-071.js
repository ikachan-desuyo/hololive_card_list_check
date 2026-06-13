/**
 * ラプラス・ダークネス (hBP07-071) 紫・Debut・HP120（#秘密結社holoX #シューター）
 * コラボエフェクト「おい、お前」:
 *   自分のデッキの上から5枚を見る。その中から、Debutの紫ホロメン1枚を公開し、手札に加える。
 *   そして残ったカードを好きな順でデッキの下に戻す。
 *   → lookTopDeck(5) → Debut紫ホロメンを1枚（任意）addToHand → 残りを orderCardsFlow で下に戻す。
 * アーツ「手作りの朝ごはんを要求する」(30): 効果テキストなし（dmg:30のみ）。
 */
export default {
  number: 'hBP07-071',
  collabEffect: {
    name: 'おい、お前',
    *run(ctx) {
      const seen = ctx.lookTopDeck(5);
      const cand = seen.filter(
        (c) => c.kind === 'holomen' && c.color === '紫' && c.bloomLevel === 'Debut');
      const picked = yield ctx.chooseCard({
        cards: cand,
        title: '手札に加えるDebutの紫ホロメンを選択（任意）',
        optional: true,
        skipLabel: '加えない',
      });
      let remaining = seen;
      if (picked) {
        ctx.addToHand(picked, { reveal: true }); // 公開して手札に加える
        remaining = seen.filter((c) => c !== picked);
      }
      // 残ったカードを好きな順でデッキの下に戻す
      const ordered = yield* ctx.orderCardsFlow(remaining, 'デッキの下に戻す順番');
      ctx.deckToBottom(ordered);
    },
  },
};
