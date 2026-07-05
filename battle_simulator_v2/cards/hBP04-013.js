/**
 * 博衣こより (hBP04-013) 白・2nd・HP200
 * ギフト「絶対諦めない！」:
 *   このホロメンが相手のホロメンをダウンさせた時、自分のデッキの上から1枚をホロパワーにする。
 *   その後、自分のホロパワーを見る。その中から1枚を公開し、手札に加える。そしてホロパワーをシャッフルする。
 *   → triggers.onOpponentDown（アーツでダウンさせた時に発火）
 * アーツ「かくせいのこより」(160):
 *   このホロメンに#こよラボを持つサポートカードが付いている時、自分のデッキから、
 *   #こよラボを持つサポートカード1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 */
export default {
  number: 'hBP04-013',
  triggers: {
    *onOpponentDown(ctx) {
      const p = ctx.player;
      // デッキの上から1枚をホロパワーに
      if (p.deck.length > 0) {
        p.holoPower.push(p.deck.shift());
        ctx.log('デッキの上から1枚をホロパワーにした');
      }
      if (p.holoPower.length === 0) return;
      // ホロパワーを見て1枚を手札に
      const picked = yield ctx.chooseCard({
        cards: p.holoPower,
        title: 'ホロパワーから手札に加えるカードを選択',
      });
      if (picked) {
        p.holoPower.splice(p.holoPower.indexOf(picked), 1);
        ctx.addToHand(picked);
      }
      // ホロパワーをシャッフル
      ctx.engine._shuffle(p.holoPower);
      ctx.log('ホロパワーをシャッフルした');
    },
  },
  arts: {
    'かくせいのこより': {
      *run(ctx) {
        const hasLab = ctx.sourceHolomem.attachments.some((a) => (a.tags || []).includes('こよラボ'));
        if (!hasLab) return;
        const cand = ctx.deckCards((c) => c.kind === 'support' && (c.tags || []).includes('こよラボ'));
        const picked = yield ctx.chooseCard({
          cards: cand,
          title: '手札に加える #こよラボ サポートを選択（任意）',
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
  },
};
