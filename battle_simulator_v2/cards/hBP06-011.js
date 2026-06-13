/**
 * ラオーラ・パンテーラ (hBP06-011) 白・1st・HP160（#Justice,#絵）
 * コラボエフェクト「RAORAO」:
 *   自分のデッキから、#Justiceを持つ[Debutホロメンか1stホロメン]1枚を公開し、手札に加える。
 *   そしてデッキをシャッフルする。
 * アーツ「Mamma mia」(30): テキスト効果なし。
 */
export default {
  number: 'hBP06-011',
  collabEffect: {
    name: 'RAORAO',
    *run(ctx) {
      const cand = ctx.deckCards((c) =>
        c.kind === 'holomen' && (c.bloomLevel === 'Debut' || c.bloomLevel === '1st') && ctx.hasTag(c, 'Justice'));
      const picked = yield ctx.chooseCard({
        cards: cand, title: '手札に加える #Justice の[Debut/1st]ホロメンを選択（任意）',
        optional: true, skipLabel: '見つからなかったことにする',
      });
      if (picked) { ctx.removeFromDeck(picked); ctx.addToHand(picked); }
      ctx.shuffleDeck();
    },
  },
};
