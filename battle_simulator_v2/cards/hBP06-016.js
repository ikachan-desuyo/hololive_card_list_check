/**
 * 響咲リオナ (hBP06-016) 白・Debut・HP110（#DEV_IS #FLOW #GLOW）
 * コラボエフェクト「一緒に共闘しよ」:
 *   自分が後攻で最初のターンなら、自分のデッキから、
 *   [コラボエフェクトと#FLOW #GLOW を持つホロメン]1枚を公開し、手札に加える。
 *   そしてデッキをシャッフルする。
 * アーツ「おつりおなああああ！」(20): テキスト効果なし。
 */
export default {
  number: 'hBP06-016',
  collabEffect: {
    name: '一緒に共闘しよ',
    *run(ctx) {
      if (!ctx.isFirstTurnGoingSecond()) return;
      const cand = ctx.deckCards((c) =>
        c.kind === 'holomen' &&
        (c.keywords || []).some((k) => k.subtype === 'コラボエフェクト') &&
        ctx.hasTag(c, 'FLOW') && ctx.hasTag(c, 'GLOW'));
      const picked = yield ctx.chooseCard({
        cards: cand,
        title: '手札に加える[コラボエフェクトと#FLOW #GLOW を持つホロメン]を選択（任意）',
        optional: true,
        skipLabel: '見つからなかったことにする',
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked);
      }
      ctx.shuffleDeck();
    },
  },
};
