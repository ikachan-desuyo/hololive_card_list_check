/**
 * さくらみこ (hSD16-004) ホロメン・赤・Debut・0期生/ベイビー
 *
 * コラボエフェクト「後攻なんですｹｰﾄﾞ」:
 *   自分が後攻で最初のターンなら、自分のデッキから〈35P〉1枚を公開し、
 *   このホロメンに付ける。そしてデッキをシャッフルする。
 *   → collabEffect で実装。条件は ctx.isFirstTurnGoingSecond()。
 *     〈35P〉(hBP03-107) はサポート・ファン。付け先は「このホロメン」(=ctx.sourceHolomem) に固定。
 *     条件を満たさない／デッキに〈35P〉が無い場合はシャッフルのみ（公開して付ける部分はスキップ）。
 *     ※「公開し、付ける」は強制効果だが、デッキに無ければ付けられないので、その場合はシャッフルのみ。
 *      複数枚あればどれを付けるか選択する（公開対象の選択）。
 *
 * アーツ「でゃまれ！」(20ダメージ、任意エール1): テキスト効果なし（素のダメージのみ）。実装不要。
 */
export default {
  number: 'hSD16-004',
  collabEffect: {
    name: '後攻なんですｹｰﾄﾞ',
    *run(ctx) {
      // 条件: 自分が後攻で、自分の最初のターン
      if (!ctx.isFirstTurnGoingSecond()) return;
      const self = ctx.sourceHolomem;
      const cand = ctx.deckCards((c) => c.name === '35P');
      if (cand.length === 0 || !self) {
        ctx.shuffleDeck();
        return;
      }
      let picked = cand[0];
      if (cand.length > 1) {
        picked = yield ctx.chooseCard({
          cards: cand,
          title: 'デッキから公開して付ける〈35P〉を選択',
        });
      }
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.flashReveal(picked);
        ctx.attachSupport(picked, self);
      }
      ctx.shuffleDeck();
    },
  },
};
