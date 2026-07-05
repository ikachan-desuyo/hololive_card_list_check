/**
 * 百鬼あやめ (hBP06-034) 赤・Debut・HP130（JP/2期生/シューター）
 * アーツ「夏の海でドキドキデート」(10+):
 *   自分の手札1枚をアーカイブできる：
 *   このターンの間、自分のセンターホロメンの〈百鬼あやめ〉のアーツ+30。
 *
 * テキスト厳密解釈:
 *   - 効果はアーツ解決時のコスト型（手札1枚アーカイブ）。任意（できる）。
 *   - 修正対象は「自分のセンターポジションにいる、名前が〈百鬼あやめ〉のホロメン」。
 *     アーツ使用者が必ずしもセンターとは限らないため、センター判定＋名前一致で適用する。
 *   - 「このターンの間」なのでターン限定修正（エンドステップで自動消滅）。
 */
export default {
  number: 'hBP06-034',
  arts: {
    '夏の海でドキドキデート': {
      *run(ctx) {
        if (ctx.player.hand.length === 0) return;
        const ok = yield ctx.confirm('手札1枚をアーカイブして、センターの〈百鬼あやめ〉のアーツ+30しますか？');
        if (!ok) return;
        const card = yield ctx.chooseCard({
          cards: ctx.player.hand,
          title: 'アーカイブする手札を選択',
        });
        if (!card) return;
        ctx.removeFromHand(card);
        ctx.player.archive.push(card);
        ctx.log(`${card.name} をアーカイブした`);
        ctx.addTurnModifier({
          kind: 'artsPlus',
          amount: 30,
          ownerIdx: ctx.playerIdx,
          match: (h) => ctx.engine._zoneOf(h) === 'center' && h.stack[0]?.name === '百鬼あやめ',
          description: 'このターン、自分のセンターの〈百鬼あやめ〉のアーツ+30',
        });
      },
    },
  },
};
