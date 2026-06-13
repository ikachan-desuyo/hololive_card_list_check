/**
 * ラプラス・ダークネス (hSD03-011) 無色・Spot・HP60（#JP #秘密結社holoX #シューター）
 * アーツ「泥棒建設農業大臣」(10): 効果なし。
 * アーツ「絶対、食わせてみせるわ」(20):
 *   自分の手札が2枚以下の時、手札が3枚になるまで、自分のデッキを引く。
 */
export default {
  number: 'hSD03-011',
  arts: {
    '絶対、食わせてみせるわ': {
      *run(ctx) {
        const handCount = ctx.player.hand.length;
        if (handCount > 2) return; // 手札が2枚以下の時のみ
        const need = 3 - handCount; // 手札が3枚になるまで引く
        if (need > 0) ctx.draw(need);
      },
    },
  },
};
