/**
 * ロボ子さん (hBP03-059) 紫・1st・HP130（#JP #0期生 #シューター）
 * ブルームエフェクト「PONしたらその分」:
 *   自分のデッキの上から3枚を見る。その中から、#0期生を持つホロメン1枚を公開し、手札に加える。
 *   そして残ったカードを好きな順でデッキの下に戻す。
 *
 *   「PONしたらその分」はキーワード（ブルームエフェクト）の名称（フレーバー）であり、
 *   効果本文（desc）に発動条件は無い。エンジンは Bloom 時にブルームエフェクトを
 *   無条件で誘発させる (13.3) ため、Bloom 時に desc の手順をそのまま実行する。
 *
 * アーツ「笑顔になーーれっ」(40):
 *   テキスト効果なし（ダメージ40のみ）のためアーツ定義は不要。
 */
export default {
  number: 'hBP03-059',
  bloomEffect: {
    name: 'PONしたらその分',
    *run(ctx) {
      const looked = ctx.lookTopDeck(3);
      if (looked.length === 0) return;
      // その中から #0期生 を持つホロメン1枚を公開し手札に加える（「1枚」=最大1枚）
      const candidates = looked.filter(
        (c) => c.kind === 'holomem' && ctx.hasTag(c, '0期生'),
      );
      let toHand = null;
      if (candidates.length > 0) {
        toHand = yield ctx.chooseCard({
          cards: candidates,
          displayCards: looked.filter((c) => !candidates.includes(c)),
          title: '手札に加える #0期生 ホロメンを選択（任意）',
          optional: true,
          skipLabel: '加えない',
        });
        if (toHand) ctx.addToHand(toHand);
      }
      // 残ったカードを好きな順でデッキの下に戻す
      const rest = looked.filter((c) => c !== toHand);
      if (rest.length > 0) {
        const ordered = yield* ctx.orderCardsFlow(rest, 'デッキの下に戻す順番');
        ctx.deckToBottom(ordered);
      }
    },
  },
};
