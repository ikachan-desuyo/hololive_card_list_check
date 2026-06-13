/**
 * 不知火フレア (hBP03-079) Buzzホロメン・黄・1st・HP240（#JP #3期生 #ハーフエルフ）
 *
 * ブルームエフェクト「今日はステキな日」:
 *   自分のエールデッキから、黄エール1枚を公開し、このホロメンに送る。
 *   そしてエールデッキをシャッフルする。
 *   → 黄エールが無い場合はシャッフルのみ。複数あればプレイヤーが選ぶ。
 *
 * アーツ「サンライズエール」(50+):
 *   このホロメンにエールが3枚以上付いている時、このアーツ+30。
 */
export default {
  number: 'hBP03-079',
  bloomEffect: {
    name: '今日はステキな日',
    *run(ctx) {
      const yellows = ctx.player.cheerDeck.filter((c) => c.color === '黄');
      if (yellows.length === 0) {
        ctx.shuffleCheerDeck();
        return;
      }
      const cheer = yellows.length === 1
        ? yellows[0]
        : yield ctx.chooseCard({ cards: yellows, title: '公開する黄エールを選択' });
      if (!cheer) { ctx.shuffleCheerDeck(); return; }

      ctx.flashReveal(cheer);
      ctx.removeFromCheerDeck(cheer);
      ctx.attachCheer(cheer, ctx.sourceHolomem);
      ctx.shuffleCheerDeck();
    },
  },
  arts: {
    'サンライズエール': {
      dmgBonus(ctx) {
        return (ctx.sourceHolomem?.cheers?.length || 0) >= 3 ? 30 : 0;
      },
    },
  },
};
