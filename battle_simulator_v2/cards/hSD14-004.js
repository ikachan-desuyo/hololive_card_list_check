/**
 * 白上フブキ (hSD14-004) 白・Debut・HP90（#1期生 #ゲーマーズ）
 * コラボエフェクト「白上のとこにおいでー」:
 *   自分が後攻で最初のターンなら、自分のデッキからマスコット1枚を公開し、手札に加える。
 *   そしてデッキをシャッフルする。
 *
 * 解釈:
 *  - 後攻かつ自分の最初のターンでなければ何もしない（ctx.isFirstTurnGoingSecond）。
 *  - 「マスコット1枚を公開し、手札に加える」=デッキ内のマスコットから1枚選び公開して手札へ。
 *    デッキに触れるため対象が無くても最後にシャッフルする。
 *  - マスコットが見つからない場合も選ばないことができる（任意の探索として安全側に optional）。
 *
 * アーツ「ハイ　フレンズ！」は dmg のみでテキスト効果なし（エンジンが素点処理）。
 * 保留: なし
 */
export default {
  number: 'hSD14-004',
  collabEffect: {
    name: '白上のとこにおいでー',
    *run(ctx) {
      if (!ctx.isFirstTurnGoingSecond()) return;
      const mascots = ctx.deckCards((c) => c.supportType === 'マスコット');
      const picked = yield ctx.chooseCard({
        cards: mascots,
        title: '手札に加えるマスコットを選択',
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
