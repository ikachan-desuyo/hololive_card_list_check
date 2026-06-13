/**
 * ラオーラ・パンテーラ (hBP04-019) 白
 * コラボエフェクト「只今、情報収集中」:
 *   自分のデッキの上から3枚を見る。その中から、#絵を持つホロメン1枚を公開し、手札に加える。
 *   そして残ったカードを好きな順でデッキの下に戻す。
 * アーツ「Art Streamer」(70+):
 *   [コラボポジション限定]自分のセンターホロメンが#絵を持つ時、このアーツ+80。
 */
export default {
  number: 'hBP04-019',
  collabEffect: {
    name: '只今、情報収集中',
    *run(ctx) {
      const looked = ctx.lookTopDeck(3);
      const pool = looked.slice();
      const candidates = pool.filter((c) => c.kind === 'holomen' && ctx.hasTag(c, '絵'));
      if (candidates.length > 0) {
        const picked = yield ctx.chooseCard({
          cards: candidates,
          title: '手札に加える #絵 のホロメンを選択（任意）',
          optional: true,
          skipLabel: '加えない',
          displayCards: pool,
        });
        if (picked) {
          pool.splice(pool.indexOf(picked), 1);
          ctx.addToHand(picked);
        }
      }
      const ordered = yield* ctx.orderCardsFlow(pool, 'デッキの下に戻す順番');
      ctx.deckToBottom(ordered);
    },
  },
  arts: {
    'Art Streamer': {
      dmgBonus(ctx) {
        const inCollab = ctx.engine._zoneOf(ctx.sourceHolomem) === 'collab';
        const centerEga = ctx.player.center && ctx.hasTag(ctx.player.center.stack[0], '絵');
        return inCollab && centerEga ? 80 : 0;
      },
    },
  },
};
