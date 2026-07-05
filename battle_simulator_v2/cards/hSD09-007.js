/**
 * 不知火フレア (hSD09-007) ホロメン
 * ギフト「クールダウンしよ」: [コラボポジション限定]相手のターンで、このホロメンがダウンした時、
 *   自分のライフが相手より少ないなら、自分の減るライフ-1。
 *   → triggers.onDown でダウン処理前に lifeReductionOnDown を立て、ライフダメージ計上時に -1 される。
 */
export default {
  number: 'hSD09-007',
  triggers: {
    *onDown(ctx) {
      if (ctx.state.turnPlayer === ctx.playerIdx) return; // 相手のターンのみ
      if (ctx.sourceHolomemPos()?.zone !== 'collab') return; // [コラボ限定]
      if (ctx.player.life.length >= ctx.opponent.life.length) return; // 自ライフが相手より少ない
      ctx.sourceHolomem.lifeReductionOnDown = 1;
      ctx.log('「クールダウンしよ」: このダウンで減るライフ-1');
    },
  },
};
