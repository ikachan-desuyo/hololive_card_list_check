/**
 * ベスティア・ゼータ (hBP01-026) 白・1st・HP110（#ID #ID3期生）
 * ブルームエフェクト「新たな運命」:
 *   DebutからBloomした時、自分のデッキから、#ID3期生を持つBuzz以外の
 *   [Debutホロメンか1stホロメン]1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 * アーツ「ステージみんな「私のもの」」(30): テキスト効果なし。
 */
export default {
  number: 'hBP01-026',
  bloomEffect: {
    name: '新たな運命',
    *run(ctx) {
      // Q54「DebutからBloomした時」: Bloom元（stack[1]）がDebutの場合のみ発動
      if (ctx.sourceHolomem?.stack[1]?.bloomLevel !== 'Debut') {
        ctx.log('発動条件を満たしていない（Debutからのブルームではない）');
        return;
      }
      const cand = ctx.deckCards((c) =>
        c.kind === 'holomen' &&
        !c.buzz &&
        ['Debut', '1st'].includes(c.bloomLevel) &&
        ctx.hasTag(c, 'ID3期生'));
      const picked = yield ctx.chooseCard({
        cards: cand,
        title: '手札に加える #ID3期生 のBuzz以外のDebut/1stホロメンを選択（任意）',
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
