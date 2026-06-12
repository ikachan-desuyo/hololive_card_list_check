/**
 * アイラニ・イオフィフティーン 1st (hBP01-054)
 * ブルームエフェクト「緑の光が広がる海」:
 * 自分のエールデッキの上から1枚を、自分の〈アイラニ・イオフィフティーン〉以外の
 * #IDを持つホロメンに送る。
 */
export default {
  number: 'hBP01-054',
  bloomEffect: {
    name: '緑の光が広がる海',
    *run(ctx) {
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.hasTag(e.top, 'ID') && e.top.name !== 'アイラニ・イオフィフティーン',
        title: 'エールデッキの上から1枚を送るホロメンを選択',
      });
      if (target) ctx.sendCheerFromCheerDeckTop(target.holomem);
    },
  },
};
