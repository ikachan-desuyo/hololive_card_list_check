/**
 * 不知火フレア (hSD07-004) 黄・Debut・HP100（#JP #3期生 #ハーフエルフ）
 * アーツ「ワンダフルライフ」(30+):
 *   自分の手札の枚数が相手より少ない時、このアーツ+10。
 */
export default {
  number: 'hSD07-004',
  arts: {
    'ワンダフルライフ': {
      dmgBonus(ctx) {
        // 「少ない時」= 厳密に相手より少ない（同数は対象外）
        return ctx.player.hand.length < ctx.opponent.hand.length ? 10 : 0;
      },
    },
  },
};
