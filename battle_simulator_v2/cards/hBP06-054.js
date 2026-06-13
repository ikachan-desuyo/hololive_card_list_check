/**
 * 雪花ラミィ (hBP06-054) 青・2nd・HP200（#5期生 #ハーフエルフ #お酒）
 * ブルームエフェクト「有言実行！！」:
 *   このホロメンに〈雪民〉が付いているなら、相手のセンターホロメンに特殊ダメージ20を与える。
 *   その後、自分のデッキを1枚引く。
 *   このホロメンに〈雪民〉が3枚以上付いているなら、かわりに、自分のデッキを2枚引く。
 *   （「かわりに」が掛かるのはドロー枚数：3枚以上なら1枚ではなく2枚引く）
 * アーツ「暖かい誕生日とその先へ」(140+):
 *   このホロメンに付いている〈雪民〉1枚につき、このアーツ+10。 → dmgBonus
 */
export default {
  number: 'hBP06-054',
  bloomEffect: {
    name: '有言実行！！',
    *run(ctx) {
      const yukiminCount = ctx.sourceHolomem.attachments.filter((a) => a.name === '雪民').length;
      if (yukiminCount === 0) {
        ctx.log('〈雪民〉が付いていないため発動しない');
        return;
      }
      // 相手のセンターホロメンに特殊ダメージ20
      const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
      if (center) ctx.dealSpecialDamage(center, 20);
      // 〈雪民〉3枚以上なら2枚、そうでなければ1枚引く
      ctx.draw(yukiminCount >= 3 ? 2 : 1);
    },
  },
  arts: {
    '暖かい誕生日とその先へ': {
      dmgBonus(ctx) {
        const yukiminCount = ctx.sourceHolomem.attachments.filter((a) => a.name === '雪民').length;
        return yukiminCount * 10;
      },
    },
  },
};
