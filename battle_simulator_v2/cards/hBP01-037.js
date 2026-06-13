/**
 * アキ・ローゼンタール (hBP01-037) 緑・2nd・HP190（#JP #1期生 #ハーフエルフ #お酒）
 * ブルームエフェクト「ゴシックドール」:
 *   自分のエールデッキの上から1枚を、自分のホロメンに送る。
 *   その後、このホロメンにツールが付いている時、このホロメンのHP40回復。
 * アーツ「秘密の合鍵」(70+):
 *   このホロメンにツールが付いている時、このアーツ+50。
 */
export default {
  number: 'hBP01-037',
  bloomEffect: {
    name: 'ゴシックドール',
    *run(ctx) {
      // エールデッキの上から1枚を、自分のホロメン1人に送る（送り先はプレイヤー選択）
      const target = yield ctx.chooseHolomem({
        side: 'self',
        title: 'エールを送る自分のホロメンを選択',
      });
      if (target) ctx.sendCheerFromCheerDeckTop(target.holomem);
      // その後、このホロメン（アキ自身）にツールが付いていればHP40回復
      const self = ctx.sourceHolomem;
      if (self && self.attachments.some((a) => a.supportType === 'ツール')) {
        ctx.heal(self, 40);
      }
    },
  },
  arts: {
    '秘密の合鍵': {
      dmgBonus(ctx) {
        return ctx.sourceHolomem?.attachments.some((a) => a.supportType === 'ツール') ? 50 : 0;
      },
    },
  },
};
