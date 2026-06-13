/**
 * 響咲リオナ (hSD10-010) 無色・Spot・HP170（#DEV_IS #FLOW #GLOW）
 *
 * コラボエフェクト「私の元においで～っ」:
 *   自分の手札1枚をアーカイブできる（任意のコスト）：自分のデッキから、
 *   [コラボエフェクトと #FLOW #GLOW を持つホロメン]1枚を公開し、手札に加える。
 *   そしてデッキをシャッフルする。
 *   → コラボエフェクトを持つホロメンの判定は card.keywords に subtype:'コラボエフェクト' があるかで行う。
 *
 * アーツ「RIONA IN DA HOUSE～!」(50+):
 *   自分のステージに #FLOW #GLOW を持つ 2nd以上のホロメンがいるなら、このアーツ+30。
 *   → bloom_level の進行は Debut → 1st → 2nd。「2nd以上」は bloomLevel === '2nd' で判定。
 */
const isFlowGlow = (ctx, top) => ctx.hasTag(top, 'FLOW') && ctx.hasTag(top, 'GLOW');
const hasCollabEffect = (card) =>
  (card.keywords || []).some((k) => k.subtype === 'コラボエフェクト');

export default {
  number: 'hSD10-010',
  collabEffect: {
    name: '私の元においで～っ',
    *run(ctx) {
      // 検索条件を満たすホロメンがデッキに無ければ、コストを払う意味がないので何もしない
      const found = ctx.deckCards(
        (c) => c.kind === 'holomen' && isFlowGlow(ctx, c) && hasCollabEffect(c),
      );
      if (found.length === 0) return;
      if (ctx.player.hand.length === 0) return;

      // 任意のコスト: 手札1枚をアーカイブ
      const cost = yield ctx.chooseCard({
        cards: ctx.player.hand,
        title: 'アーカイブする手札1枚を選択（任意。選ばない場合は効果不使用）',
        optional: true,
        skipLabel: '使用しない',
      });
      if (!cost) return;
      ctx.removeFromHand(cost);
      ctx.player.archive.push(cost);
      ctx.log(`${ctx.player.name}: ${cost.name} をアーカイブ（コスト）`);

      // デッキから [コラボエフェクト + #FLOW #GLOW を持つホロメン] 1枚を公開し手札に加える
      const picked = yield ctx.chooseCard({
        cards: found,
        title: '手札に加える [コラボエフェクト + #FLOW #GLOW ホロメン] を選択',
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked, { reveal: true });
      }
      // そしてデッキをシャッフルする
      ctx.shuffleDeck();
    },
  },
  arts: {
    'RIONA IN DA HOUSE～!': {
      dmgBonus(ctx) {
        const has = ctx.holomems('self', (e) =>
          e.top.bloomLevel === '2nd' && isFlowGlow(ctx, e.top)).length > 0;
        return has ? 30 : 0;
      },
    },
  },
};
