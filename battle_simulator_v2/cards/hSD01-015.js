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
      const top = center.stack[0];
      // SorAZ 等「〈ときのそら〉かつ〈AZKi〉」の別名カードは両条件に該当するため、
      // else-if ではなく独立した2つの if で両方の効果を発揮させる。
      const isSora = ctx.nameIs(top, 'ときのそら');
      const isAZKi = ctx.nameIs(top, 'AZKi');
      if (isSora) {
        ctx.draw(1);
      }
      if (isAZKi) {
        ctx.sendCheerFromCheerDeckTop(center);
      }
      if (!isSora && !isAZKi) {
        ctx.log('〈ときのそら〉〈AZKi〉とのコラボではないため発動しない');
      }
    },
  },
};
