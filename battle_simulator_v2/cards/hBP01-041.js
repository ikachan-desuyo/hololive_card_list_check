/**
 * 兎田ぺこら 1st (hBP01-041) 緑・1st・HP90（#JP #3期生 #ケモミミ）
 * ブルームエフェクト「成長した兎田ぺこらを」:
 *   自分のエールデッキの上から1枚を、自分のセンターホロメンかコラボホロメンに送る。
 * アーツ「見逃しちゃだめぺこだよ！」(30): 追加効果なし（素点のみ）。
 */
export default {
  number: 'hBP01-041',
  bloomEffect: {
    name: '成長した兎田ぺこらを',
    *run(ctx) {
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'collab',
        title: 'エールを送るセンターorコラボホロメンを選択',
      });
      if (target) ctx.sendCheerFromCheerDeckTop(target.holomem);
    },
  },
};
