/**
 * モココ・アビスガード (hBP08-035) 赤・Debut・HP130 / EN・Advent・ケモミミ
 *
 * [アーツ] やったぁ大勝ちだ！！ (10+):
 *   このホロメンに青エールが付いているなら、このアーツ+30。
 *   → dmgBonus(ctx): sourceHolomem に青エールが1枚でも付いていれば +30、無ければ 0。
 *     色判定は ctx.cheerCountOfColor（実効色）。推しFUWAMOCO（hBP08-003）の
 *     「赤エールすべては青エールとしても扱う」エイリアスを反映する。
 *
 * 保留: なし（アーツを全文実装）。
 */
export default {
  number: 'hBP08-035',

  arts: {
    'やったぁ大勝ちだ！！': {
      dmgBonus(ctx) {
        const self = ctx.sourceHolomem;
        const hasBlueCheer = !!self && ctx.cheerCountOfColor(self, '青') > 0;
        return hasBlueCheer ? 30 : 0;
      },
    },
  },
};
