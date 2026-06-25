/**
 * 赤井はあと (hBP07-036) 赤・Debut・HP110（JP, 1期生, 料理）
 *
 * コラボエフェクト「AKAI HAATO VS HAACHAMA」:
 *   自分が後攻で最初のターンなら、自分のデッキから、Debutホロメンの〈赤井はあと〉2枚を
 *   公開し、ステージに出す。そしてデッキをシャッフルする。
 *   → ctx.isFirstTurnGoingSecond() で「後攻・最初のターン」を判定。
 *     〈赤井はあと〉= カード名「赤井はあと」のホロメン。Debut のものを2枚まで出す
 *     （デッキにある分だけ／ステージ上限6を超えない範囲で。「2枚」は必須だが、枚数や空きが
 *      足りなければ出せる分だけ出す）。出したらデッキをシャッフルする。
 *
 * アーツ「どちらがお好き？♡」(30):
 *   追加効果テキストなし。素のダメージのみのため arts 定義不要。
 */
export default {
  number: 'hBP07-036',
  collabEffect: {
    name: 'AKAI HAATO VS HAACHAMA',
    *run(ctx) {
      if (!ctx.isFirstTurnGoingSecond()) return; // 後攻で最初のターンのみ
      // デッキから Debut の〈赤井はあと〉を2枚、公開してステージに出す。
      // どの〈赤井はあと〉を出すかはプレイヤーが選ぶ（候補が複数あり得るため、勝手に出さない）。
      // 「2枚」は必須だが、候補やステージの空きが足りなければ出せる分だけ。一括選択
      const candidates = ctx.deckCards((c) =>
        c.kind === 'holomen' && c.bloomLevel === 'Debut' && c.name === '赤井はあと');
      // ステージの空き（上限6）と「2枚」のうち少ない方まで
      const space = Math.max(0, 6 - ctx.engine._stageCount(ctx.player));
      const count = Math.min(2, space);
      if (count > 0 && candidates.length > 0) {
        const picked = yield ctx.chooseCards({
          cards: candidates,
          count,
          title: 'ステージに出すDebut〈赤井はあと〉を選択（2枚）',
        });
        for (const c of picked) {
          ctx.removeFromDeck(c);
          ctx.log(`${ctx.player.name}: ${c.name} を公開`);
          ctx.putToBack(c);
        }
      }
      ctx.shuffleDeck(); // 効果が発動した（後攻最初のターン）なら必ずシャッフルする
    },
  },
};
