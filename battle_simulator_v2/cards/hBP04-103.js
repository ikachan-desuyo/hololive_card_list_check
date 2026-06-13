/**
 * カラス (hBP04-103) サポート・マスコット
 * このマスコットが付いているホロメンのアーツ+10。
 * ◆〈ラプラス・ダークネス〉に付いていたら能力追加:
 *   [コラボポジション限定][ターンに1回] 自分のメインステップで、サイコロを1回振れる：
 *   奇数の時、このマスコットが付いているホロメンをバックポジションに移動する。
 * マスコットは、自分のホロメン1人につき1枚だけ付けられる。
 */
export default {
  number: 'hBP04-103',
  attached: {
    artsPlus() { return 10; },
  },
  activatedAbilities: [{
    name: 'カラスの導き',
    oncePerTurn: true,
    canUse(ctx) {
      if (ctx.sourceHolomem.stack[0].name !== 'ラプラス・ダークネス') return false;
      return ctx.sourceHolomemPos()?.zone === 'collab'; // コラボポジション限定
    },
    *run(ctx) {
      const v = (yield* ctx.rollDice());
      if (v % 2 === 1) {
        ctx.log('奇数: バックポジションへ移動する');
        ctx.moveToBack(ctx.sourceHolomem);
      } else {
        ctx.log('偶数: 移動しない');
      }
    },
  }],
};
