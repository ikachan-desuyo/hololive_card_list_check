/**
 * 戌神ころね (hBP03-064) 黄・1st・HP160（#JP #ゲーマーズ #ケモミミ）
 * アーツ「ぶるぁあああああ!!!!!!!!!!!!!!」(40+):
 *   自分の初期ライフから減っているライフ1につき、このアーツ+10。
 *   （初期ライフ = 推しのライフ枚数、現在ライフ = ctx.player.life.length）
 * アーツ「おーしぇーい」(70): テキスト効果なし（基礎ダメージのみ）。
 */
export default {
  number: 'hBP03-064',
  arts: {
    'ぶるぁあああああ!!!!!!!!!!!!!!': {
      dmgBonus(ctx) {
        const initial = ctx.player.oshi?.life || 0;
        const current = ctx.player.life.length;
        const lost = Math.max(0, initial - current);
        return lost * 10;
      },
    },
  },
};
