/**
 * いろはにほへっと あやふぶみ (hSD02-012) サポート・イベント・LIMITED
 * [サポート効果] このカードは、自分の手札がこのカードを含まずに6枚以下でなければ使えない。
 *   自分のデッキの上から4枚を見る。その中から、〈白上フブキ〉と〈大神ミオ〉と〈百鬼あやめ〉を
 *   好きな枚数公開し、公開したホロメンを手札に加える。そして残ったカードを好きな順でデッキの下に戻す。
 * LIMITED：ターンに1枚しか使えない。（LIMITED制限はエンジン側で処理）
 */
const TARGET_NAMES = ['白上フブキ', '大神ミオ', '百鬼あやめ'];

export default {
  number: 'hSD02-012',
  support: {
    canUse(ctx) {
      // このカードを除いた手札が6枚以下
      return ctx.player.hand.length - 1 <= 6;
    },
    *run(ctx) {
      const looked = ctx.lookTopDeck(4);
      const pool = looked.slice();
      // 〈白上フブキ〉〈大神ミオ〉〈百鬼あやめ〉を「好きな枚数」公開して手札に加える。
      // 該当ホロメンが無くなるか、プレイヤーが「これ以上加えない」を選ぶまで繰り返す。
      while (true) {
        const candidates = pool.filter(
          (c) => c.kind === 'holomen' && TARGET_NAMES.includes(c.name));
        if (candidates.length === 0) break;
        const picked = yield ctx.chooseCard({
          cards: candidates,
          title: '手札に加えるホロメンを選択（〈白上フブキ〉/〈大神ミオ〉/〈百鬼あやめ〉・任意）',
          optional: true,
          skipLabel: 'これ以上加えない',
          displayCards: pool,
        });
        if (!picked) break;
        pool.splice(pool.indexOf(picked), 1);
        ctx.addToHand(picked);
      }
      // 残ったカードを好きな順でデッキの下に戻す
      const ordered = yield* ctx.orderCardsFlow(pool, 'デッキの下に戻す順番');
      ctx.deckToBottom(ordered);
    },
  },
  ai: {
    // デッキ上から4枚に該当ホロメンがいる期待値で評価（簡易）
    supportValue({ player }) {
      if (player.hand.length - 1 > 6) return 0;
      const total = player.deck.length;
      if (total === 0) return 0;
      const targets = player.deck.filter(
        (c) => c.kind === 'holomen' && TARGET_NAMES.includes(c.name)).length;
      // 上4枚に何枚含まれるかの期待値 × ホロメン1枚あたりの価値（概算20）
      const expected = Math.min(4, total) * (targets / total);
      return Math.round(expected * 20);
    },
  },
};
