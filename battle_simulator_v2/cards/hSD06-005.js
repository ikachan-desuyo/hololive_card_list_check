/**
 * 風真いろは (hSD06-005) 緑・1st・HP120（#秘密結社holoX）
 * ブルームエフェクト「かざまとおでかけ」:
 *   自分のエールデッキの上から1枚を、自分の#秘密結社holoXを持つホロメンに送る。
 * アーツ「かざまといっしょ！」(30): 追加効果なし（テキストにダメージのみ）。
 */
export default {
  number: 'hSD06-005',
  bloomEffect: {
    name: 'かざまとおでかけ',
    *run(ctx) {
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.hasTag(e.top, '秘密結社holoX'),
        title: 'エールを送る #秘密結社holoX ホロメンを選択',
      });
      if (target) ctx.sendCheerFromCheerDeckTop(target.holomem);
    },
  },
};
