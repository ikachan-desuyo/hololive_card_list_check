/**
 * 七詩ムメイ (hBP01-020) 白・2nd・HP190（#EN #Promise #トリ #絵）
 * コラボエフェクト「あの日の約束」:
 *   自分のデッキから、#Promiseを持つホロメン1枚を公開し、手札に加える。
 *   そしてデッキをシャッフルする。
 * アーツ「みんな一緒に」(70+, 特攻 紫+50):
 *   このターンの間、自分のバックホロメン1人につき、
 *   自分のセンターホロメンとコラボホロメンのアーツ+10。
 *   → アーツ使用時のバックホロメン数 × 10 を、このターンの間センター/コラボに付与。
 */
export default {
  number: 'hBP01-020',
  collabEffect: {
    name: 'あの日の約束',
    *run(ctx) {
      const candidates = ctx.deckCards(
        (c) => c.kind === 'holomen' && ctx.hasTag(c, 'Promise'),
      );
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: '手札に加える#Promiseのホロメンを選択',
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
  arts: {
    'みんな一緒に': {
      *run(ctx) {
        // 使用時点の自分のバックホロメン数を数える
        const backCount = ctx.holomems('self', (e) => e.pos.zone === 'back').length;
        const amount = backCount * 10;
        if (amount <= 0) return; // バックが0人なら効果なし
        ctx.addTurnModifier({
          kind: 'artsPlus',
          amount,
          ownerIdx: ctx.playerIdx,
          match: (h) => {
            const z = ctx.engine._zoneOf(h);
            return z === 'center' || z === 'collab';
          },
          description: `このターン、自分のセンター/コラボのアーツ+${amount}（バック${backCount}人）`,
        });
      },
    },
  },
};
