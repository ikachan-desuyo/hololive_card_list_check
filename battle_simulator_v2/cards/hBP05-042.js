/**
 * 猫又おかゆ (hBP05-042) 青・Debut・HP90（#ゲーマーズ）
 * コラボエフェクト「一緒に入ろ～！」:
 *   自分が後攻で最初のターンなら、自分のデッキから、#ゲーマーズを持つ2ndホロメン1枚を公開し、
 *   手札に加える。そしてデッキをシャッフルする。
 * アーツ「ずうっと一緒だよ」(30): テキスト効果なし。
 */
export default {
  number: 'hBP05-042',
  collabEffect: {
    name: '一緒に入ろ～！',
    *run(ctx) {
      if (!ctx.isFirstTurnGoingSecond()) return;
      const cand = ctx.deckCards((c) =>
        c.kind === 'holomen' && c.bloomLevel === '2nd' && ctx.hasTag(c, 'ゲーマーズ'));
      const picked = yield ctx.chooseCard({
        cards: cand,
        title: '手札に加える #ゲーマーズ の2ndホロメンを選択（任意）',
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
