/**
 * 戌神ころね (hBP03-062) 黄・Debut・HP100（#JP #ゲーマーズ #ケモミミ）
 * キーワード/コラボエフェクト「ころねダイナー」:
 *   このホロメンのエール1枚をアーカイブできる：
 *   自分のデッキから、#ゲーマーズを持つDebutホロメン1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → メインステップの起動型能力（コスト: 自分のエール1枚アーカイブ）
 * アーツ「ご注文はこれだでな」(30): テキスト効果なし。
 */
export default {
  number: 'hBP03-062',
  activatedAbilities: [{
    name: 'ころねダイナー',
    oncePerTurn: false, // ターン制限の記載なし
    canUse(ctx) {
      if (ctx.sourceHolomem.cheers.length < 1) return false;
      // デッキに #ゲーマーズ を持つ Debut ホロメンがいる時に意味がある
      return ctx.deckCards((c) => c.kind === 'holomen' && c.bloomLevel === 'Debut' && ctx.hasTag(c, 'ゲーマーズ')).length > 0;
    },
    *run(ctx) {
      const cheer = yield ctx.chooseCard({
        cards: [...ctx.sourceHolomem.cheers],
        title: 'コスト: アーカイブするエールを選択',
      });
      if (!cheer) return;
      yield* ctx.archiveCheer(ctx.sourceHolomem, cheer);
      const candidates = ctx.deckCards((c) => c.kind === 'holomen' && c.bloomLevel === 'Debut' && ctx.hasTag(c, 'ゲーマーズ'));
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: '手札に加える #ゲーマーズ Debutホロメンを選択',
        optional: true,
        skipLabel: '見つからなかったことにする',
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked, { reveal: true });
      }
      ctx.shuffleDeck();
    },
  }],
};
