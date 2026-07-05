/**
 * シオリ・ノヴェラ (hSD12-006) 青・1st・Buzzホロメン・HP250（#EN #Advent）
 * ブルームエフェクト「A Study in Advent」:
 *   自分の手札のサポートカード1枚をアーカイブできる：
 *   自分のデッキから、#Adventを持つ[Debutホロメンか1stホロメン]1枚を公開し、手札に加える。
 *   そしてデッキをシャッフルする。
 * アーツ「初歩的なことよ」(40):
 *   相手のホロメン1人に特殊ダメージ20を与える。
 */
export default {
  number: 'hSD12-006',
  bloomEffect: {
    name: 'A Study in Advent',
    *run(ctx) {
      // コスト: 手札のサポートカード1枚をアーカイブ（任意）
      const supports = ctx.player.hand.filter((c) => c.kind === 'support');
      if (supports.length === 0) return;
      const ok = yield ctx.confirm('手札のサポートカード1枚をアーカイブして、デッキから#AdventのDebut/1stホロメンを手札に加えますか？');
      if (!ok) return;
      const cost = yield ctx.chooseCard({
        cards: supports,
        title: 'コスト: アーカイブするサポートカードを選択',
      });
      if (!cost) return;
      ctx.removeFromHand(cost);
      ctx.player.archive.push(cost);
      ctx.log(`${ctx.player.name}: ${cost.name} をアーカイブした`);

      // 効果: デッキから#AdventのDebut/1stホロメンを公開して手札へ
      const candidates = ctx.deckCards((c) =>
        c.kind === 'holomen' &&
        ['Debut', '1st'].includes(c.bloomLevel) &&
        ctx.hasTag(c, 'Advent'));
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: '手札に加える #Advent のDebut/1stホロメンを選択（任意）',
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
    '初歩的なことよ': {
      *run(ctx) {
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          title: '特殊ダメージ20を与える相手ホロメンを選択',
        });
        if (target) yield* ctx.dealSpecialDamage(target, 20);
      },
    },
  },
};
