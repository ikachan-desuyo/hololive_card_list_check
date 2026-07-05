/**
 * 七詩ムメイ (hBP01-015) 白・Debut・HP90（#EN #Promise #トリ #絵）
 * アーツ「Oh,Hi」(10+):
 *   このターンに自分がサポートカードを使っていた時、このアーツ+20。
 */
export default {
  number: 'hBP01-015',
  arts: {
    'Oh,Hi': {
      dmgBonus(ctx) {
        return ctx.countSupportThisTurn(() => true) > 0 ? 20 : 0;
      },
    },
  },
};
