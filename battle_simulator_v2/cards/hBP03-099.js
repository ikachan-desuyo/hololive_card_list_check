/**
 * マグチ (hBP03-099) サポート・マスコット
 * [サポート効果] このマスコットが付いているホロメンのアーツ+10。
 * ◆〈さくらみこ〉に付いていたら能力追加:
 *   このマスコットが付いているホロメンがコラボした時、このターンの間、
 *   自分のセンターホロメンの〈さくらみこ〉のアーツ+10。
 * マスコットは、自分のホロメン1人につき1枚だけ付けられる。
 *   （マスコット1人1枚の上限はエンジンの _canAttachSupport が既定で処理）
 *
 * → triggers.onCollab で実装。ホストが〈さくらみこ〉のときコラボで、このターンの間、
 *   センターの〈さくらみこ〉のアーツ+10。
 */
export default {
  number: 'hBP03-099',
  attached: {
    artsPlus() {
      return 10;
    },
  },
  triggers: {
    // ◆〈さくらみこ〉に付いていたら: ホストがコラボした時、このターン センターの〈さくらみこ〉のアーツ+10
    * onCollab(ctx) {
      if (ctx.sourceHolomem?.stack[0].name !== 'さくらみこ') return;
      ctx.addTurnModifier({
        kind: 'artsPlus', amount: 10, ownerIdx: ctx.playerIdx,
        match: (hm) => ctx.engine._zoneOf(hm) === 'center' && hm.stack[0].name === 'さくらみこ',
        description: 'マグチ: このターン センターの〈さくらみこ〉のアーツ+10',
      });
    },
  },
};
