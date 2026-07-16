/**
 * ハコス・ベールズ (hBP06-044) 赤・1st・HP160（#EN #Promise #ケモミミ）
 * アーツ「ホイールオブフォーチュン」(30+):
 *   このゲーム中に、自分のSP推しスキル「🎲ƎNOZ N∩Ⅎ ƎH⊥ O⊥ ƎWOϽ˥ƎM🎲」を使っていたなら、
 *   サイコロを1回振る。出た目の数1につき、このアーツ+10。
 *   → 指定スキルは推し〈ハコス・ベールズ〉(hBP06-005) のSP。ctx.player.spOshiSkillUsedInfo の
 *     oshiNumber が hBP06-005 であることを条件にする（別の推しのSPスキルでは成立しない）。
 * アーツ「ありがチュー！」(70): 効果テキストなし（素のダメージのみ）→ 実装不要。
 */
export default {
  number: 'hBP06-044',
  arts: {
    'ホイールオブフォーチュン': {
      *run(ctx) {
        // SP推しスキル「🎲ƎNOZ N∩Ⅎ ƎH⊥ O⊥ ƎWOϽ˥ƎM🎲」（推し hBP06-005）をこのゲーム中に使っていること
        const info = ctx.player.spOshiSkillUsedInfo;
        if (!info || info.oshiNumber !== 'hBP06-005') return;
        const value = (yield* ctx.rollDice());
        ctx.addArtBonus(value * 10, `サイコロの目${value}×10`);
      },
    },
  },
};
