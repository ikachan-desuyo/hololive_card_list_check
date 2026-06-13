/**
 * 小鳥遊キアラ (hBP01-065) 赤・1st・HP110（#EN #Myth #トリ）
 *
 * [ブルームエフェクト] Let's do this!!!!:
 *   自分のデッキの上から3枚を見る。その中から、ホロメン1枚を公開し、手札に加える。
 *   そして残ったカードをアーカイブする。
 *   → ホロメンが見えていれば1枚を公開して手札へ（「ホロメン1枚を公開し」=必須・任意ではない）。
 *     見た中にホロメンが無ければ手札に加えず、見た3枚すべてをアーカイブする。
 *
 * [アーツ] 盛り上げたいとおもいます！ (40):
 *   追加効果なし（固定40ダメージ）。アーツ定義は不要のため記述しない。
 */
export default {
  number: 'hBP01-065',
  bloomEffect: {
    name: "Let's do this!!!!",
    *run(ctx) {
      const seen = ctx.lookTopDeck(3);
      if (seen.length === 0) return;
      const holomems = seen.filter((c) => c.kind === 'holomen');
      if (holomems.length > 0) {
        const picked = yield ctx.chooseCard({
          cards: holomems,
          title: '手札に加えるホロメンを選択',
          displayCards: seen.filter((c) => !holomems.includes(c)),
        });
        if (picked) {
          ctx.addToHand(picked, { reveal: true });
        }
      }
      // 残った（手札に加えなかった）カードをアーカイブ
      const rest = ctx.player.revealed.filter((c) => seen.includes(c));
      for (const c of rest) {
        ctx._unreveal(c);
        ctx.player.archive.push(c);
      }
      if (rest.length > 0) ctx.log(`${ctx.player.name}: 残り${rest.length}枚をアーカイブした`);
    },
  },
};
