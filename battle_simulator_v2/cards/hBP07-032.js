/**
 * 輪堂千速 (hBP07-032) ホロメン・緑・Debut・HP130（#DEV_IS #FLOW #GLOW）
 *
 * コラボエフェクト「ドライブ行こうよ」:
 *   自分が後攻で最初のターンなら、自分のデッキから、
 *   [1stホロメンの〈輪堂千速〉と〈ふぐ太郎〉]1枚ずつを公開し、手札に加える。
 *   そしてデッキをシャッフルする。
 *   → 〈輪堂千速〉の1stホロメン1枚と、〈ふぐ太郎〉（サポート・ツール。「1stホロメンの」は
 *     千速のみに掛かる）1枚をそれぞれ別に選んで手札へ（非公開領域のサーチ＝見つからなかった
 *     ことにできる）。条件成立時は最後に必ずデッキをシャッフルする。
 *
 * アーツ「一陣の夜風」(10): 効果テキスト無し（ダメージのみ）→ 定義不要。
 */
export default {
  number: 'hBP07-032',
  collabEffect: {
    name: 'ドライブ行こうよ',
    *run(ctx) {
      if (!ctx.isFirstTurnGoingSecond()) return;

      // 〈輪堂千速〉の1stホロメン1枚
      const chihaya = ctx.deckCards(
        (c) => c.kind === 'holomen' && c.bloomLevel === '1st' && c.name === '輪堂千速');
      const pickedChihaya = yield ctx.chooseCard({
        cards: chihaya,
        title: 'デッキから1stホロメンの〈輪堂千速〉1枚を公開して手札に加える',
        optional: true,
        skipLabel: '見つからなかった（加えない）',
      });
      if (pickedChihaya) {
        ctx.removeFromDeck(pickedChihaya);
        ctx.addToHand(pickedChihaya, { reveal: true });
      }

      // 〈ふぐ太郎〉1枚（サポート・ツール。「1stホロメンの」は〈輪堂千速〉のみに掛かる）
      const fugu = ctx.deckCards(
        (c) => c.kind === 'support' && ctx.nameIs(c, 'ふぐ太郎'));
      const pickedFugu = yield ctx.chooseCard({
        cards: fugu,
        title: 'デッキから1stホロメンの〈ふぐ太郎〉1枚を公開して手札に加える',
        optional: true,
        skipLabel: '見つからなかった（加えない）',
      });
      if (pickedFugu) {
        ctx.removeFromDeck(pickedFugu);
        ctx.addToHand(pickedFugu, { reveal: true });
      }

      // そしてデッキをシャッフルする（条件成立時は探索結果に関わらず必ず実行）
      ctx.shuffleDeck();
    },
  },
};
