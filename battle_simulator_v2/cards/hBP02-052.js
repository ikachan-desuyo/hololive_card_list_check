/**
 * クレイジー・オリー (hBP02-052) 紫・1st・HP120（#ID #ID2期生 #語学）
 * ブルームエフェクト「真実一路」: 自分のデッキを1枚引く。
 * アーツ「正義の名の下に、儂は」(40+):
 *   このホロメンに紫以外のエールが付いている時、このアーツ+20。
 */
export default {
  number: 'hBP02-052',
  bloomEffect: {
    name: '真実一路',
    *run(ctx) {
      ctx.draw(1);
    },
  },
  arts: {
    '正義の名の下に、儂は': {
      dmgBonus(ctx) {
        const hasNonPurple = (ctx.sourceHolomem?.cheers || []).some((c) => c.color && c.color !== '紫');
        return hasNonPurple ? 20 : 0;
      },
    },
  },
};
