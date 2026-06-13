/**
 * 桃鈴ねね (hBP07-082) 黄・2nd・HP200（#JP #5期生 #歌 #絵）
 * コラボエフェクト「ねぽらぼが最強です！！！！！！！！！！！！！」:
 *   自分のデッキから、#5期生を持つ2ndホロメン1枚を公開し、手札に加える。
 *   そしてデッキをシャッフルする。
 * アーツ「アチョ～～～！」(50, 特攻:青+50):
 *   テキスト効果なし（ダメージ/特攻アイコンはエンジンが処理）。
 */
export default {
  number: 'hBP07-082',
  collabEffect: {
    name: 'ねぽらぼが最強です！！！！！！！！！！！！！',
    *run(ctx) {
      const cand = ctx.deckCards((c) =>
        c.kind === 'holomen' && c.bloomLevel === '2nd' && ctx.hasTag(c, '5期生'));
      const picked = yield ctx.chooseCard({
        cards: cand,
        title: '手札に加える #5期生 の2ndホロメンを選択',
        optional: true,
        skipLabel: '見つからなかった / 加えない',
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked, { reveal: true });
      }
      ctx.shuffleDeck();
    },
  },
};
