/**
 * エリザベス・ローズ・ブラッドフレイム (hBP07-046) 赤・Debut・HP130（#EN #Justice #歌）
 *
 * コラボエフェクト「後の先を取る！」:
 *   自分が後攻で最初のターンなら、自分のデッキから、
 *   [1stホロメンの〈エリザベス・ローズ・ブラッドフレイム〉と〈Thorn〉]1枚ずつを公開し、手札に加える。
 *   そしてデッキをシャッフルする。
 *
 * アーツ「Onwards and Upwards!」(30): テキスト効果なし（素点のみ）。定義不要。
 *
 * 解釈:
 *  - 条件は「後攻で最初のターンなら」→ ctx.isFirstTurnGoingSecond()。
 *  - 「1枚ずつを…公開し、手札に加える」= 各カード名の1stホロメンを1枚ずつ加える（任意ではない）。
 *    デッキに同名の該当カードが複数あれば、どの1枚を加えるかをプレイヤーが選ぶ。
 *  - 該当が無い名前はスキップ（無くても残りは加える）。
 *  - 条件成立時はデッキを必ずシャッフルする（加えた枚数に関わらず、テキスト通り実行）。
 */
export default {
  number: 'hBP07-046',
  collabEffect: {
    name: '後の先を取る！',
    *run(ctx) {
      if (!ctx.isFirstTurnGoingSecond()) {
        ctx.log('後攻で最初のターンではないため、効果は発動しない');
        return;
      }
      const targetNames = ['エリザベス・ローズ・ブラッドフレイム', 'Thorn'];
      for (const name of targetNames) {
        const candidates = ctx.deckCards(
          (c) => c.kind === 'holomen' && c.bloomLevel === '1st' && c.name === name);
        if (candidates.length === 0) {
          ctx.log(`デッキに1stの〈${name}〉が無いためスキップ`);
          continue;
        }
        let picked = candidates[0];
        if (candidates.length > 1) {
          picked = yield ctx.chooseCard({
            cards: candidates,
            title: `手札に加える1stの〈${name}〉を選択`,
          });
          if (!picked) picked = candidates[0];
        }
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked); // 公開ログ付き
      }
      ctx.shuffleDeck();
    },
  },
};
