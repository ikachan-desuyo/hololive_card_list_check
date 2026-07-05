/**
 * ココロ (hBP04-100) サポート・マスコット
 * このマスコットが付いているホロメンのHP+20。
 * ◆〈博衣こより〉に付いていたら能力追加:
 *   このマスコットが付いているホロメンがコラボした時、このターンの間、このホロメンのアーツ+10。
 * マスコットは、自分のホロメン1人につき1枚だけ付けられる。
 *
 * → triggers.onCollab で実装。ホストが〈博衣こより〉のときコラボで、このターンの間 ホストのアーツ+10。
 */
export default {
  number: 'hBP04-100',
  attached: {
    hpPlus() {
      return 20;
    },
  },
  triggers: {
    // ◆〈博衣こより〉に付いていたら: ホストがコラボした時、このターン このホロメンのアーツ+10
    * onCollab(ctx) {
      const host = ctx.sourceHolomem;
      if (host?.stack[0].name !== '博衣こより') return;
      ctx.addTurnModifier({
        kind: 'artsPlus', amount: 10, ownerIdx: ctx.playerIdx,
        match: (hm) => hm === host,
        description: 'ココロ: このターン このホロメンのアーツ+10',
      });
    },
  },
};
