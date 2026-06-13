/**
 * 獅白ぼたん 1st (hBP03-020) 緑・1st・HP110（#JP #5期生 #ケモミミ #シューター）
 * ブルームエフェクト「SSSSR」:
 *   自分のエールデッキの上から1枚を、自分のバックホロメンの〈獅白ぼたん〉に送る。
 * アーツ「ショッピングカートで来た」(50): 追加効果なし（素点のみ）。
 */
export default {
  number: 'hBP03-020',
  bloomEffect: {
    name: 'SSSSR',
    *run(ctx) {
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.pos.zone === 'back' && e.top.name === '獅白ぼたん',
        title: 'エールを送るバックの〈獅白ぼたん〉を選択',
      });
      if (target) ctx.sendCheerFromCheerDeckTop(target.holomem);
    },
  },
};
