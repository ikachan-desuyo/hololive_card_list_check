/**
 * ベスティア・ゼータ (hBP07-015) 白・Debut・HP130（#ID #ID3期生）
 * コラボエフェクト「Adopt Me？」:
 *   自分が後攻で最初のターンなら、自分のデッキから、#ID3期生を持つBuzzホロメン1枚を公開し、
 *   手札に加える。そしてデッキをシャッフルする。
 * アーツ「ノラネコ見つけた~」(20): テキスト効果なし。
 */
export default {
  number: 'hBP07-015',
  collabEffect: {
    name: 'Adopt Me？',
    *run(ctx) {
      if (!ctx.isFirstTurnGoingSecond()) return;
      const cand = ctx.deckCards((c) => c.kind === 'holomen' && c.buzz && ctx.hasTag(c, 'ID3期生'));
      const picked = yield ctx.chooseCard({
        cards: cand, title: '手札に加える #ID3期生 のBuzzホロメンを選択（任意）',
        optional: true, skipLabel: '見つからなかったことにする',
      });
      if (picked) { ctx.removeFromDeck(picked); ctx.addToHand(picked); }
      ctx.shuffleDeck();
    },
  },
};
