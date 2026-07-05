/**
 * 沙花叉クロヱ (hBP02-036) ホロメン・青・Debut・HP60（#JP #秘密結社holoX #海）
 *
 * コラボエフェクト「掃除屋でインターン」:
 *   自分のデッキの上から3枚を見る。その中から、#秘密結社holoXを持つ2ndホロメン1枚を
 *   公開し、手札に加える。そして残ったカードを好きな順でデッキの下に戻す。
 *   → 条件一致カードが無ければ手札に加えず、見た3枚すべてを好きな順でデッキの下に戻す。
 *     「公開」は addToHand のログで担保。
 *
 * アーツ「吐いて捨てるような現実を！」(20, コスト:無色1) はテキスト効果なし（素のアーツ）。
 */
export default {
  number: 'hBP02-036',
  collabEffect: {
    name: '掃除屋でインターン',
    *run(ctx) {
      const seen = ctx.lookTopDeck(3);
      if (seen.length === 0) return;
      seen.forEach((c) => ctx.flashReveal && ctx.flashReveal(c));

      // 見た中から #秘密結社holoX を持つ 2nd ホロメンを1枚（任意で）手札に加える
      const candidates = seen.filter(
        (c) => c.kind === 'holomen' && c.bloomLevel === '2nd' && ctx.hasTag(c, '秘密結社holoX'));
      let picked = null;
      if (candidates.length > 0) {
        picked = yield ctx.chooseCard({
          cards: candidates,
          title: '#秘密結社holoX を持つ2ndホロメン1枚を手札に加える',
          displayCards: seen,
          optional: true,
          skipLabel: '手札に加えない',
        });
        if (picked) ctx.addToHand(picked, { reveal: true });
      }

      // 残ったカードを好きな順でデッキの下に戻す
      const rest = seen.filter((c) => c !== picked);
      if (rest.length === 0) return;
      const ordered = yield* ctx.orderCardsFlow(rest, 'デッキの下に戻す順番');
      ctx.deckToBottom(ordered);
      ctx.log(`${ordered.length}枚をデッキの下に戻した`);
    },
  },
  arts: {
    '吐いて捨てるような現実を！': {},
  },
};
