/**
 * 博衣こより (hSD01-015)
 * コラボエフェクト:
 *   ■〈ときのそら〉とコラボした時、自分のデッキを1枚引く。
 *   ■〈AZKi〉とコラボした時、自分のエールデッキの上から1枚を、自分のセンターホロメンに送る。
 * （「〈X〉とコラボした時」= センターが〈X〉の状態でコラボした時）
 */
export default {
  number: 'hSD01-015',
  collabEffect: {
    name: 'SoAzKo',
    *run(ctx) {
      const center = ctx.player.center;
      if (!center) return;
      const name = center.stack[0].name;
      if (name === 'ときのそら') {
        ctx.draw(1);
      } else if (name === 'AZKi') {
        ctx.sendCheerFromCheerDeckTop(center);
      } else {
        ctx.log('〈ときのそら〉〈AZKi〉とのコラボではないため発動しない');
      }
    },
  },
};
