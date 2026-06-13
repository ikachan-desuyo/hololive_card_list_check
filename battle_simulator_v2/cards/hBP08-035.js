/**
 * モココ・アビスガード (hBP08-035) 赤・Debut・HP130 / EN・Advent・ケモミミ
 *
 * [アーツ] やったぁ大勝ちだ！！ (10+):
 *   このホロメンに青エールが付いているなら、このアーツ+30。
 *   → dmgBonus(ctx): sourceHolomem に青エールが1枚でも付いていれば +30、無ければ 0。
 *
 * 保留: なし（アーツを全文実装）。
 */
export default {
  number: 'hBP08-035',

  arts: {
    'やったぁ大勝ちだ！！': {
      dmgBonus(ctx) {
        const hasBlueCheer = (ctx.sourceHolomem?.cheers || []).some((c) => c.color === '青');
        return hasBlueCheer ? 30 : 0;
      },
    },
  },
};
