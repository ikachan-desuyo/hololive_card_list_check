/**
 * 宝鐘マリン (hBP02-032) 赤・1st・HP130（#JP #3期生 #絵 #海）
 * ブルームエフェクト「宝鐘の海賊団」:
 *   自分のデッキから、〈宝鐘マリン〉1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   このブルームエフェクト「宝鐘の海賊団」はターンに1回しか使えない。
 *   → デッキに〈宝鐘マリン〉が無い場合は公開せずシャッフルのみ。
 * アーツ「ヨーソロー」(50): 効果なし（コンパイラ/エンジンの基本ダメージ処理に任せる）。
 */
export default {
  number: 'hBP02-032',
  bloomEffect: {
    name: '宝鐘の海賊団',
    *run(ctx) {
      // ターンに1回制限（同名のブルームエフェクト全体で共有）
      if (ctx.oncePerTurnUsed('hBP02-032:宝鐘の海賊団')) return;
      ctx.markOncePerTurn('hBP02-032:宝鐘の海賊団');

      const cand = ctx.deckCards((c) => c.name === '宝鐘マリン');
      if (cand.length === 0) {
        ctx.shuffleDeck();
        return;
      }
      const picked = yield ctx.chooseCard({
        cards: cand,
        title: 'デッキから〈宝鐘マリン〉1枚を公開して手札に加える',
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
