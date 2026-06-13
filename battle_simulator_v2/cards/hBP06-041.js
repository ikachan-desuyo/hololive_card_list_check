/**
 * ハコス・ベールズ (hBP06-041) 赤・Debut・HP110（#EN #Promise #ケモミミ）
 * コラボエフェクト「GYM RAT」:
 *   自分が後攻で最初のターンなら、自分のデッキを3枚引いた後、手札2枚をアーカイブする。
 * アーツ「Brat Wellness」(30): 追加効果なし（テキストに「+」やテキスト効果が無いため定義不要）。
 */
export default {
  number: 'hBP06-041',
  collabEffect: {
    name: 'GYM RAT',
    *run(ctx) {
      if (!ctx.isFirstTurnGoingSecond()) return;
      ctx.draw(3);
      // 手札2枚をアーカイブ（選択）
      for (let i = 0; i < 2 && ctx.player.hand.length > 0; i++) {
        const card = yield ctx.chooseCard({
          cards: ctx.player.hand,
          title: `アーカイブする手札を選択（${i + 1}/2）`,
        });
        if (!card) break;
        ctx.removeFromHand(card);
        ctx.player.archive.push(card);
        ctx.log(`${card.name} をアーカイブした`);
      }
    },
  },
};
