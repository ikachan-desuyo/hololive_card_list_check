/**
 * 尾丸ポルカ (hSD07-012) 赤・Debut・HP50（#JP #5期生 #ケモミミ）
 * コラボエフェクト「僕らに水を」:
 *   自分のセンターホロメンが〈不知火フレア〉の時、自分の手札の枚数が相手より少なければ、自分のデッキを1枚引く。
 * アーツ「骨を埋める覚悟」 dmg:20 — 追加効果なし（コンパイラ/標準処理に委譲）。
 */
export default {
  number: 'hSD07-012',
  collabEffect: {
    name: '僕らに水を',
    *run(ctx) {
      // 自分のセンターホロメンが〈不知火フレア〉か判定
      const center = ctx.holomems('self', (e) => ctx.engine._zoneOf(e.holomem) === 'center')[0];
      if (!center || center.top.name !== '不知火フレア') return;
      // 自分の手札の枚数が相手より少なければ
      if (ctx.player.hand.length < ctx.opponent.hand.length) {
        ctx.draw(1);
      }
    },
  },
};
