/**
 * 大神ミオ (hSD02-011) 無色・Spot・HP50（#JP #ゲーマーズ #ケモミミ #料理）
 * キーワード/コラボエフェクト「おにけもの会」:
 *   自分の手札のホロメン1枚をアーカイブできる：
 *   自分のエールデッキの上から1枚を自分のDebutホロメンに送る。
 *   → メインステップの起動型能力として実装（コスト: 手札のホロメン1枚をアーカイブ）。
 *      ターン回数制限の記載は無いので無制限（oncePerTurn:false）。
 * アーツ「あやふぶみの「み」担当」(10): テキスト効果なし。
 */
export default {
  number: 'hSD02-011',
  activatedAbilities: [{
    name: 'おにけもの会',
    oncePerTurn: false, // ターン制限の記載なし
    canUse(ctx) {
      // コスト: 手札にホロメンがいること
      const handHolomems = ctx.player.hand.filter((c) => c.kind === 'holomen');
      if (handHolomems.length === 0) return false;
      // エールデッキにカードが残っていること
      if (ctx.player.cheerDeck.length < 1) return false;
      // 送り先: 自分のDebutホロメンがいること
      const debuts = ctx.holomems('self', (e) => e.top?.bloomLevel === 'Debut');
      return debuts.length > 0;
    },
    *run(ctx) {
      // コスト: 手札のホロメン1枚をアーカイブ
      const handHolomems = ctx.player.hand.filter((c) => c.kind === 'holomen');
      if (handHolomems.length === 0) return;
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
  }],
};
