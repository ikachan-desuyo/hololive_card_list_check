/**
 * 古石ビジュー (hSD12-009) 紫・1st・HP130（#EN #Advent #ベイビー）
 *
 * [ブルームエフェクト] 賑やかな家族:
 *   自分のデッキの上から3枚を見る。その中から、#Adventを持つホロメン1枚を公開し、手札に加える。
 *   そして残ったカードを好きな順でデッキの下に戻す。
 *   → 見た中に #Advent ホロメンがあれば1枚を公開して手札へ（「公開し」=必須・任意ではない）。
 *     無ければ手札に加えず、見た3枚すべてを好きな順でデッキの下に戻す。
 *
 * [アーツ] とっても感謝してるの (30):
 *   追加効果なし（固定30ダメージ）。アーツ定義は不要のため記述しない。
 */
export default {
  number: 'hSD12-009',
  bloomEffect: {
    name: '賑やかな家族',
    *run(ctx) {
      const seen = ctx.lookTopDeck(3);
      if (seen.length === 0) return;
      const advents = seen.filter(
        (c) => c.kind === 'holomen' && ctx.hasTag(c, 'Advent'));
      if (advents.length > 0) {
        const picked = yield ctx.chooseCard({
          cards: advents,
          title: '手札に加える #Advent ホロメンを選択',
          displayCards: seen.filter((c) => !advents.includes(c)),
        });
        if (picked) {
          ctx.addToHand(picked, { reveal: true });
        }
      }
      // 残った（手札に加えなかった）カードを好きな順でデッキの下に戻す
      const rest = ctx.player.revealed.filter((c) => seen.includes(c));
      if (rest.length === 0) return;
      const ordered = yield* ctx.orderCardsFlow(rest, 'デッキの下に戻す順番');
      ctx.deckToBottom(ordered);
      ctx.log(`${ctx.player.name}: 残り${ordered.length}枚をデッキの下に戻した`);
    },
  },
};
