/**
 * 桃鈴ねね (hBP07-077) 黄・Debut・HP130（#JP #5期生 #歌 #絵）
 * コラボエフェクト「あぱぱ」:
 *   自分が後攻で最初のターンなら、自分のデッキから #5期生 を持つ 2nd ホロメン1枚を
 *   公開し手札に加える。そしてデッキをシャッフルする。
 * アーツ「ねね、酔っちゃった～」(10): 効果テキストなし（純粋なダメージアーツ）。
 */
export default {
  number: 'hBP07-077',
  collabEffect: {
    name: 'あぱぱ',
    *run(ctx) {
      // 「後攻で最初のターンなら」
      if (!ctx.isFirstTurnGoingSecond()) return;
      const candidates = ctx.deckCards(
        (c) => c.kind === 'holomen' && c.bloomLevel === '2nd' && (c.tags || []).includes('5期生'),
      );
      if (candidates.length === 0) {
        ctx.shuffleDeck();
        return;
      }
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: '手札に加える #5期生 を持つ 2nd ホロメンを選択',
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
