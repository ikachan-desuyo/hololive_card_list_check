/**
 * ロボ子さん (hBP06-062) 紫・Debut・HP110（JP/0期生/シューター）
 * コラボエフェクト「ロボ子と一緒にあそぼ」:
 *   自分が後攻で最初のターンなら、自分のデッキから〈ろぼさー〉2枚を公開し、手札に加える。
 *   そしてデッキをシャッフルする。
 * アーツ「ひとりじゃないよ」dmg30: 効果テキスト無し（純粋なダメージのみ）のため定義不要。
 */
export default {
  number: 'hBP06-062',
  collabEffect: {
    name: 'ロボ子と一緒にあそぼ',
    *run(ctx) {
      if (!ctx.isFirstTurnGoingSecond()) return; // 後攻で最初のターンのみ
      const cand = ctx.deckCards((c) => c.name === 'ろぼさー');
      // デッキから〈ろぼさー〉を最大2枚公開して手札に加える
      const take = Math.min(2, cand.length);
      for (let i = 0; i < take; i++) {
        const card = cand[i];
        ctx.removeFromDeck(card);
        ctx.addToHand(card);
      }
      ctx.shuffleDeck();
    },
  },
};
