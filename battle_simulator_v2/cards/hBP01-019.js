/**
 * 七詩ムメイ (hBP01-019) 白・1st・HP100（#EN #Promise #トリ #絵）
 * ブルームエフェクト「みんなと歌って踊りたい！」:
 *   DebutからBloomした時、自分のデッキから、#Promiseを持つBuzz以外の
 *   [Debutホロメンか1stホロメン]1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 * アーツ「いつも応援してくれてありがとう！」(30): 効果なし（素アーツ）。
 */
export default {
  number: 'hBP01-019',
  bloomEffect: {
    name: 'みんなと歌って踊りたい！',
    *run(ctx) {
      // 「DebutからBloomした時」: Bloom元（stack[1]）がDebutの場合のみ発動
      if (ctx.sourceHolomem?.stack[1]?.bloomLevel !== 'Debut') {
        ctx.log('発動条件を満たしていない（Debutからのブルームではない）');
        return;
      }
      const candidates = ctx.deckCards(
        (c) => c.kind === 'holomen' &&
          !c.buzz &&
          (c.bloomLevel === 'Debut' || c.bloomLevel === '1st') &&
          ctx.hasTag(c, 'Promise'),
      );
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: '手札に加える#Promiseの[Debut/1st]ホロメンを選択（Buzz以外）',
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
