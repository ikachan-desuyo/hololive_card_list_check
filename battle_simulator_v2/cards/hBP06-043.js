/**
 * ハコス・ベールズ (hBP06-043) 赤・1st・HP160（#EN #Promise #ケモミミ）
 * コラボエフェクト「Once a Peasant,」:
 *   自分の手札の#Promiseを持つホロメン1枚をアーカイブできる：
 *   相手のセンターホロメンかコラボホロメンに特殊ダメージ30を与える。
 *   → コストは任意（「できる：」）。手札の#Promiseホロメンをアーカイブして発動。
 * アーツ「ALWAYS A PEASANT.」(30): テキスト効果なし（コンパイラ/エンジンの素のアーツ処理に任せる）。
 */
export default {
  number: 'hBP06-043',
  collabEffect: {
    name: 'Once a Peasant,',
    *run(ctx) {
      // コスト: 手札の#Promiseを持つホロメン1枚をアーカイブ（任意）
      const promiseHolomems = ctx.player.hand.filter(
        (c) => c.card_type === 'ホロメン' && (c.tags || []).includes('Promise'),
      );
      if (promiseHolomems.length === 0) return; // コストを払えない
      const ok = yield ctx.confirm('手札の#Promiseホロメン1枚をアーカイブして特殊ダメージ30を与えますか？');
      if (!ok) return;
      const cost = yield ctx.chooseCard({
        cards: promiseHolomems,
        title: 'コスト: アーカイブする#Promiseホロメンを選択',
      });
      if (!cost) return;
      ctx.removeFromHand(cost);
      ctx.player.archive.push(cost);
      ctx.log('手札の#Promiseホロメンをアーカイブした');
      // 効果: 相手のセンターかコラボに特殊ダメージ30
      const target = yield ctx.chooseHolomem({
        side: 'opp',
        filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'collab',
        title: '特殊ダメージ30を与える相手ホロメンを選択（センターかコラボ）',
      });
      if (target) yield* ctx.dealSpecialDamage(target, 30);
    },
  },
};
