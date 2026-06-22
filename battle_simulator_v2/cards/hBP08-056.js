/**
 * フワワ・アビスガード (hBP08-056) ホロメン・青・1st・HP160（#EN #Advent #ケモミミ）
 *
 * [コラボエフェクト] ドキドキDoggy -Fuwawa-:
 *   自分のデッキから、1stホロメンの〈モココ・アビスガード〉1枚を公開し、手札に加える。
 *   そしてデッキをシャッフルする。
 *   → 「1stホロメンの〈モココ・アビスガード〉」= c.kind==='holomen' && c.bloomLevel==='1st' &&
 *      c.name==='モココ・アビスガード'（名称参照）。
 *      最大1枚を公開して手札に加える（非公開領域からの探索なので「見つからなかったことにする」も許容）。
 *      取り終えたらデッキをシャッフルする（条件なし＝コラボ時に常に処理）。
 *
 * [アーツ] 思いっきりやってくるよ！（40 / any）: テキスト効果なし（素点ダメージのみ）。
 *
 * 保留: なし。
 */
export default {
  number: 'hBP08-056',

  collabEffect: {
    name: 'ドキドキDoggy -Fuwawa-',
    *run(ctx) {
      // デッキから1stホロメンの〈モココ・アビスガード〉を最大1枚、公開して手札に加える
      // 〈モココ・アビスガード〉= 名称参照（FUWAMOCO のエクストラ「〈フワワ〉〈モココ〉として扱う」も一致）
      const cand = ctx.deckCards(
        (c) => c.kind === 'holomen' && c.bloomLevel === '1st' && ctx.nameIs(c, 'モココ・アビスガード'),
      );
      if (cand.length === 0) {
        ctx.log('デッキに1stの〈モココ・アビスガード〉が見つからなかった');
      } else {
        // 「1枚を公開し手札に加える」は必須（候補があれば必ず加える）。どれを加えるかだけ選ぶ。
        const target = cand.length === 1 ? cand[0] : yield ctx.chooseCard({
          cards: cand,
          title: '手札に加える1stホロメンの〈モココ・アビスガード〉を選択',
        });
        if (target) {
          ctx.removeFromDeck(target);
          ctx.addToHand(target, { reveal: true });
        }
      }

      // そしてデッキをシャッフルする
      ctx.shuffleDeck();
    },
  },
};
