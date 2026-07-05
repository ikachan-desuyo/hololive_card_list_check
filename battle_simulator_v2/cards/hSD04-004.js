/**
 * 癒月ちょこ (hSD04-004) 紫・Debut・HP60（#JP, #2期生, #料理）
 * コラボエフェクト「地獄盛りごはん」:
 *   自分の手札1枚をアーカイブできる：
 *   自分のデッキから、#食べ物を持つイベント1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   ※「できる」=コスト（手札1枚アーカイブ）は任意。支払った後の検索は実行する。
 * アーツ「いっぱい食べてね♡」(20): テキスト効果なし（ダメージのみ）。
 */
export default {
  number: 'hSD04-004',
  collabEffect: {
    name: '地獄盛りごはん',
    *run(ctx) {
      // 手札がなければコストを支払えない
      if (ctx.player.hand.length === 0) return;
      const ok = yield ctx.confirm('手札1枚をアーカイブして、デッキから#食べ物を持つイベントを手札に加えますか？');
      if (!ok) return;
      // コスト: 手札1枚をアーカイブ
      const cost = yield ctx.chooseCard({
        cards: [...ctx.player.hand],
        title: 'コスト: アーカイブする手札を選択',
      });
      if (!cost) return;
      ctx.removeFromHand(cost);
      ctx.player.archive.push(cost);
      ctx.log(`${ctx.player.name}: ${cost.name} をアーカイブした`);

      // 効果: デッキから #食べ物 を持つイベント1枚を公開して手札へ
      const candidates = ctx.deckCards((c) =>
        c.kind === 'support' && c.supportType === 'イベント' && ctx.hasTag(c, '食べ物'));
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: '手札に加える #食べ物 を持つイベントを選択',
        optional: true,
        skipLabel: '見つからなかったことにする',
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked);
      }
      ctx.shuffleDeck();
    },
  },
};
