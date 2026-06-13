/**
 * 魔法少女クロヱ (hBP02-074) 無色・Spot・HP70（#ホロウィッチ #秘密結社holoX #魔法）
 * コラボエフェクト「荒波をゆく奔放の牙！」:
 *   サイコロを1回振れる：偶数の時、自分のデッキから、ツール1枚を公開し、手札に加える。
 *   そしてデッキをシャッフルする。
 * アーツ「『シャチ』の『ホロ』！」(20): テキスト効果なし（コンパイラ任せのため未定義）。
 */
export default {
  number: 'hBP02-074',
  collabEffect: {
    name: '荒波をゆく奔放の牙！',
    *run(ctx) {
      // 「振れる」=任意
      const ok = yield ctx.confirm('サイコロを1回振りますか？');
      if (!ok) return;
      const value = ctx.rollDice();
      if (value % 2 !== 0) return; // 偶数の時のみ
      const tools = ctx.deckCards((c) => c.supportType === 'ツール');
      const picked = yield ctx.chooseCard({
        cards: tools,
        title: '手札に加えるツール1枚を選択（公開、任意）',
        optional: true,
        skipLabel: '見つからなかったことにする',
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked, { reveal: true });
      }
      ctx.shuffleDeck();
    },
  },
};
