/**
 * 百鬼あやめ (hSD02-007) ホロメン・赤・1st・HP120（#JP #2期生 #シューター）
 *
 * [キーワード/ブルームエフェクト] どーっちどっち♪:
 *   DebutからBloomした時、自分のデッキの上から2枚を見る。
 *   その中から、1枚を公開し、手札に加える。そして残ったカードをアーカイブする。
 *   → 「DebutからBloomした時」= Bloom元（stack[1]）が Debut のときのみ誘発（13.3）。
 *     上から2枚を見て1枚を手札に加え、残りはアーカイブする。
 *     デッキが1枚なら1枚だけ見てそれを手札に加える（アーカイブ対象なし）。
 *
 * [アーツ] 輝いた余を見逃さないでね～～！！ dmg:30 — 追加効果なし（コンパイラ任せ）。
 */
export default {
  number: 'hSD02-007',
  bloomEffect: {
    name: 'どーっちどっち♪',
    *run(ctx) {
      // 「DebutからBloomした時」: Bloom元が Debut のときのみ
      if (ctx.sourceHolomem?.stack[1]?.bloomLevel !== 'Debut') return;
      if (ctx.player.deck.length === 0) return;

      const seen = ctx.lookTopDeck(2);
      if (seen.length === 0) return;
      seen.forEach((c) => ctx.flashReveal && ctx.flashReveal(c));

      // 見た中から1枚を公開して手札に加える
      const kept = yield ctx.chooseCard({
        cards: seen,
        title: '【どーっちどっち♪】公開して手札に加えるカードを選択',
      });
      if (kept) ctx.addToHand(kept, { reveal: true });

      // 残ったカードをアーカイブする
      const rest = ctx.player.revealed.filter((c) => seen.includes(c) && c !== kept);
      for (const c of rest) {
        ctx._unreveal(c);
        ctx.player.archive.push(c);
      }
      if (rest.length > 0) ctx.log(`${ctx.player.name}: 残った${rest.length}枚をアーカイブした`);
    },
  },
};
