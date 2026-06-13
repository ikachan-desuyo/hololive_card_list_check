/**
 * 戌神ころね 1st (hBP06-068) 紫・HP140（#JP #ゲーマーズ #ケモミミ）
 * ブルームエフェクト「まかしなー」:
 *   自分のデッキから、〈ゆび〉1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   このブルームエフェクトはターンに1回しか使えない。
 * アーツ「おめでとうをありがとう！」(50):
 *   自分のサポートカードが付いているホロメンがいるなら、
 *   自分のデッキを1枚引いた後、手札1枚をアーカイブする。
 */
export default {
  number: 'hBP06-068',
  bloomEffect: {
    name: 'まかしなー',
    *run(ctx) {
      // 「まかしなー」はターンに1回しか使えない（同名を同ターンに複数Bloomしても1回まで）
      if (ctx.oncePerTurnUsed('hBP06-068:まかしなー')) {
        ctx.log('ブルームエフェクト「まかしなー」はこのターン既に使用済み');
        return;
      }
      ctx.markOncePerTurn('hBP06-068:まかしなー');
      const candidates = ctx.deckCards((c) => c.name === 'ゆび');
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: '手札に加える〈ゆび〉を選択',
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
  arts: {
    'おめでとうをありがとう！': {
      *run(ctx) {
        // 自分のサポートカードが付いているホロメンがいるか
        const hasSupportAttached = ctx.holomems('self').some(
          (e) => e.holomem.attachments.some((a) => a.kind === 'support'));
        if (!hasSupportAttached) return;
        if (ctx.player.deck.length === 0) return;
        ctx.draw(1);
        if (ctx.player.hand.length === 0) return;
        const discard = yield ctx.chooseCard({
          cards: ctx.player.hand,
          title: 'アーカイブする手札1枚を選択',
        });
        if (discard) {
          ctx.removeFromHand(discard);
          ctx.player.archive.push(discard);
          ctx.log(`${ctx.player.name}: ${discard.name} をアーカイブした`);
        }
      },
    },
  },
};
