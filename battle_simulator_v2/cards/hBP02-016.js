/**
 * 白銀ノエル (hBP02-016) 白・1st・HP130（#JP #3期生 #お酒）
 * ブルームエフェクト「ノエちゃんの勇姿……」:
 *   DebutからBloomした時、自分のデッキから、#3期生を持つ
 *   [Debutホロメンか1stホロメンかSpotホロメン]1枚を公開し、手札に加える。
 *   そしてデッキをシャッフルする。
 * アーツ「目に焼き付けるんだゾ♡」(30): 効果なし（素アーツ）。
 */
export default {
  number: 'hBP02-016',
  bloomEffect: {
    name: 'ノエちゃんの勇姿……',
    *run(ctx) {
      // 「DebutからBloomした時」: Bloom元（stack[1]）がDebutの場合のみ発動
      if (ctx.sourceHolomem?.stack[1]?.bloomLevel !== 'Debut') {
        ctx.log('発動条件を満たしていない（Debutからのブルームではない）');
        return;
      }
      const candidates = ctx.deckCards(
        (c) => c.kind === 'holomen' &&
          (c.bloomLevel === 'Debut' || c.bloomLevel === '1st' || c.bloomLevel === 'Spot') &&
          ctx.hasTag(c, '3期生'),
      );
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: '手札に加える#3期生の[Debut/1st/Spot]ホロメンを選択',
        optional: true,
        skipLabel: '見つからなかったことにする',
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked, { reveal: true });
      }
      ctx.shuffleDeck();
    },
  },
};
