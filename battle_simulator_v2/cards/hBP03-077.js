/**
 * アユンダ・リス (hBP03-077) 黄・1st・HP160（#ID #ID1期生 #ケモミミ #歌）
 * ブルームエフェクト「同期の絆」:
 *   自分のステージのホロメンが5人以下の時、自分のデッキから、
 *   #ID1期生を持つDebutホロメン1枚を公開し、ステージに出せる。そしてデッキをシャッフルする。
 *   → 「出せる」「公開」なので任意・公開。出す先はバックポジション（putToBack）。
 *   ステージ上限(6)はputToBack側でも担保されるが、テキストの条件は「5人以下」のため明示判定する。
 * アーツ「ナッツ」(dmg:40):
 *   テキスト効果なし（コストのみ）。実装不要。
 */
export default {
  number: 'hBP03-077',
  bloomEffect: {
    name: '同期の絆',
    *run(ctx) {
      // 条件: 自分のステージのホロメンが5人以下
      if (ctx.engine._stageCount(ctx.player) > 5) return;
      const candidates = ctx.deckCards(
        (c) => c.kind === 'holomen' && c.bloomLevel === 'Debut' && ctx.hasTag(c, 'ID1期生'),
      );
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: 'ステージに出す #ID1期生 Debutホロメンを選択（任意）',
        optional: true,
        skipLabel: '出さない／見つからなかったことにする',
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.putToBack(picked); // 公開してステージ（バック）に出す
      }
      ctx.shuffleDeck();
    },
  },
};
