/**
 * 大神ミオ (hSD02-011) 無色・Spot・HP50（#JP #ゲーマーズ #ケモミミ #料理）
 * キーワード/コラボエフェクト「おにけもの会」:
 *   自分の手札のホロメン1枚をアーカイブできる：
 *   自分のエールデッキの上から1枚を自分のDebutホロメンに送る。
 *   → collabEffect（コラボした時に1回誘発。RULES_SPEC 13.2）。
 *     コスト（手札のホロメン1枚アーカイブ）は「できる」＝任意（confirm ゲート）。
 * アーツ「あやふぶみの「み」担当」(10): テキスト効果なし。
 */
export default {
  number: 'hSD02-011',
  collabEffect: {
    name: 'おにけもの会',
    *run(ctx) {
      // コスト: 手札にホロメンがいること
      const handHolomems = ctx.player.hand.filter((c) => c.kind === 'holomen');
      if (handHolomems.length === 0) return;
      // エールデッキにカードが残っていること
      if (ctx.player.cheerDeck.length === 0) return;
      // 送り先: 自分のDebutホロメンがいること
      if (ctx.holomems('self', (e) => e.top?.bloomLevel === 'Debut').length === 0) return;
      // 「できる」= 任意コスト
      const ok = yield ctx.confirm('手札のホロメン1枚をアーカイブして、エールデッキの上から1枚をDebutホロメンに送りますか？');
      if (!ok) return;
      const cost = yield ctx.chooseCard({
        cards: handHolomems,
        title: 'コスト: アーカイブする手札のホロメンを選択',
      });
      if (!cost) return;
      ctx.removeFromHand(cost);
      ctx.player.archive.push(cost);
      ctx.log(`おにけもの会: ${cost.name} をアーカイブ`);
      // 効果: 自分のエールデッキの上から1枚を自分のDebutホロメンに送る
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.top?.bloomLevel === 'Debut',
        title: 'エールを送るDebutホロメンを選択',
      });
      if (!target) return;
      ctx.sendCheerFromCheerDeckTop(target.holomem);
    },
  },
};
