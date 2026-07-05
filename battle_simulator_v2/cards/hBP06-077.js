/**
 * 夏色まつり 2nd (hBP06-077) 黄・HP200（#JP #1期生 #シューター）
 *
 * ブルームエフェクト「Re:START」:
 *   自分のライフが相手以下なら、自分のエールデッキの上から1枚を
 *   自分の〈夏色まつり〉に送れる。（任意・「まで」ではなく「送れる」なので0可）
 *
 * アーツ「Never give up!! 夏色魂」(140+ / 黄黄無, 特攻:青+50):
 *   このターンに自分が使っていたLIMITEDのサポートカード1枚につき、このアーツ+30。
 *   （特攻 青+50 はアイコンとしてエンジン側で処理されるため、ここでは dmgBonus のみ実装）
 */
export default {
  number: 'hBP06-077',
  bloomEffect: {
    name: 'Re:START',
    *run(ctx) {
      // 自分のライフが相手以下なら（より大きいの否定＝「以下」を厳密に判定）
      if (ctx.player.life.length > ctx.opponent.life.length) return;
      if (ctx.player.cheerDeck.length === 0) return;
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.top.name === '夏色まつり',
        title: 'エールデッキの上から1枚を送る〈夏色まつり〉を選択',
        optional: true, // 「送れる」＝任意
      });
      if (target) ctx.sendCheerFromCheerDeckTop(target.holomem);
    },
  },
  arts: {
    'Never give up!! 夏色魂': {
      dmgBonus(ctx) {
        // このターンに使ったLIMITEDサポートの枚数 × 30
        const n = ctx.countSupportThisTurn((c) => c.limited);
        return n * 30;
      },
    },
  },
};
