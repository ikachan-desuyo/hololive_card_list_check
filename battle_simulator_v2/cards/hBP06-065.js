/**
 * ロボ子さん (hBP06-065) 紫・Buzz・1st・HP250（#0期生,#シューター）
 * ギフト「一言芳恩」:
 *   1stホロメンからBloomしているこのホロメンがアーツを使った時、
 *   相手のセンターホロメンかコラボホロメンに特殊ダメージ50を与える。
 *   → triggers.onArtsUse（アーツ解決後に発火）
 * アーツ「かけがえのない日々」(90):
 *   ※「直前の相手のターンに自分のホロメンがダウンしていたなら必要無色-1」は
 *     直前ターンのダウン履歴トラッキングが未対応のため未実装（基本値のみ）。
 */
export default {
  number: 'hBP06-065',
  triggers: {
    *onArtsUse(ctx) {
      const h = ctx.sourceHolomem;
      // 1stホロメンからBloomしている（重なりの下に1stがある）こと
      if (!h || !(h.stack.length > 1 && h.stack[1].bloomLevel === '1st')) return;
      const target = yield ctx.chooseHolomem({
        side: 'opp',
        filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'collab',
        title: '特殊ダメージ50を与える相手ホロメンを選択（センターかコラボ）',
      });
      if (target) yield* ctx.dealSpecialDamage(target, 50);
    },
  },
};
