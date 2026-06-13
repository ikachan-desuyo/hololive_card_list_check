/**
 * ハコス・ベールズ (hBP06-044) 赤・1st・HP160（#EN #Promise #ケモミミ）
 * アーツ「ホイールオブフォーチュン」(30+):
 *   このゲーム中に、自分のSP推しスキル「🎲ƎNOZ N∩Ⅎ ƎH⊥ O⊥ ƎWOϽ˥ƎM🎲」を使っていたなら、
 *   サイコロを1回振る。出た目の数1につき、このアーツ+10。
 *   → エンジンが追跡している ctx.player.usedSpOshiSkillThisGame を条件に使用。
 *     （SP推しスキルは各推しに1つなので「自分のSP推しスキルを使っていたなら」と一致）
 * アーツ「ありがチュー！」(70): 効果テキストなし（素のダメージのみ）→ 実装不要。
 */
export default {
  number: 'hBP06-044',
  arts: {
    'ホイールオブフォーチュン': {
      *run(ctx) {
        if (!ctx.player.usedSpOshiSkillThisGame) return; // SP推しスキル未使用なら何もしない
        const value = (yield* ctx.rollDice());
        ctx.addArtBonus(value * 10, `サイコロの目${value}×10`);
      },
    },
  },
};
