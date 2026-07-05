/**
 * 大神ミオ (hBP07-003) 推しホロメン・緑
 *
 * 推しスキル「神札の導き」[ホロパワー：-1][ターンに1回]:
 *   自分のデッキの上から2枚を見る。その中から、カード1枚を手札に加える。
 *   そして残ったカードをデッキの上に戻す。
 *   → oshiSkill として実装。
 *
 * SP推しスキル「みんなのママ」[ホロパワー：-2][ゲームに1回]:
 *   自分のデッキの上から6枚を見る。その中から、カード3枚を手札に加える。
 *   そして残ったカードを好きな順でデッキの上に戻す。
 *   その後、自分のホロメン全員のHP50回復。
 *   → spOshiSkill として実装。
 *
 * ※ホロパワーのコストはエンジンが処理するため run 内では支払わない。
 */
export default {
  number: 'hBP07-003',
  oshiSkill: {
    name: '神札の導き',
    *run(ctx) {
      // デッキの上から2枚を見る
      const looked = ctx.lookTopDeck(2);
      if (looked.length === 0) return;
      // その中からカード1枚を手札に加える（「その中から」=必ず1枚加える。枚数があれば必須）
      const picked = yield ctx.chooseCard({
        cards: looked,
        title: '手札に加えるカード1枚を選択',
      });
      if (picked) {
        ctx.addToHand(picked, { reveal: true });
      }
      // 残ったカードをデッキの上に戻す（見た順のまま上に戻す）
      const remaining = looked.filter((c) => c !== picked);
      if (remaining.length > 0) ctx.deckToTop(remaining);
    },
  },
  spOshiSkill: {
    name: 'みんなのママ',
    *run(ctx) {
      // デッキの上から6枚を見る
      const looked = ctx.lookTopDeck(6);
      // その中からカード3枚を手札に加える（枚数が足りなければある分だけ）
      const taken = yield ctx.chooseCards({
        cards: looked,
        count: 3,
        title: '手札に加えるカードを選択（3枚）',
      });
      for (const picked of taken) {
        ctx.addToHand(picked, { reveal: true });
      }
      // 残ったカードを好きな順でデッキの上に戻す
      const remaining = looked.filter((c) => !taken.includes(c));
      if (remaining.length > 0) {
        const ordered = yield* ctx.orderCardsFlow(remaining, 'デッキの上に戻す順番');
        ctx.deckToTop(ordered);
      }
      // その後、自分のホロメン全員のHP50回復
      for (const { holomem } of ctx.holomems('self')) {
        ctx.heal(holomem, 50);
      }
    },
  },
};
