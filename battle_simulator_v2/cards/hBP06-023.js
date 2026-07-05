/**
 * 風真いろは (hBP06-023) 緑・Debut・HP110（#秘密結社holoX）
 * コラボエフェクト「ホップすてっぷジャンプ！」:
 *   自分が後攻で最初のターンなら、自分のデッキから、Buzzホロメンの〈風真いろは〉1枚を公開し、
 *   手札に加える。そしてデッキをシャッフルする。
 * アーツ「GOZAGOZA536」(30): テキスト効果なし。
 */
export default {
  number: 'hBP06-023',
  collabEffect: {
    name: 'ホップすてっぷジャンプ！',
    *run(ctx) {
      if (!ctx.isFirstTurnGoingSecond()) return;
      const cand = ctx.deckCards((c) => c.kind === 'holomen' && c.buzz && c.name === '風真いろは');
      const picked = yield ctx.chooseCard({
        cards: cand, title: '手札に加えるBuzzの〈風真いろは〉を選択（任意）',
        optional: true, skipLabel: '見つからなかったことにする',
      });
      if (picked) { ctx.removeFromDeck(picked); ctx.addToHand(picked); }
      ctx.shuffleDeck();
    },
  },
};
