/**
 * 猫又おかゆ (hSD03-004) 青・Debut・HP80（#JP #ゲーマーズ #ケモミミ）
 * コラボエフェクト「僕と登校しよう…？」:
 *   自分のデッキの上から1枚を公開できる：公開したカードがDebutホロメンか
 *   Spotホロメンの時、自分のエールデッキの上から1枚をこのホロメンに送る。
 *   そして公開したカードをデッキの下に戻す。
 *   → 「公開できる」=任意。公開した場合、条件を満たせばエール送り、最後に必ずデッキ下へ戻す。
 */
export default {
  number: 'hSD03-004',
  collabEffect: {
    name: '僕と登校しよう…？',
    *run(ctx) {
      if (ctx.player.deck.length === 0) return;
      const ok = yield ctx.confirm('デッキの上から1枚を公開しますか？');
      if (!ok) return;
      const [top] = ctx.lookTopDeck(1);
      if (!top) return;
      ctx.flashReveal(top);
      // 公開したカードがDebutホロメンかSpotホロメンの時、エールデッキの上から1枚をこのホロメンに送る
      if (top.kind === 'holomen' && (top.bloomLevel === 'Debut' || top.bloomLevel === 'Spot')) {
        ctx.sendCheerFromCheerDeckTop(ctx.sourceHolomem);
      }
      // 公開したカードをデッキの下に戻す
      ctx.deckToBottom([top]);
    },
  },
  arts: {
    // アーツ「学生猫」(20) はダメージのみで追加効果なし → 定義不要
  },
};
