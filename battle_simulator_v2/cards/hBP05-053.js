/**
 * 癒月ちょこ (hBP05-053) 紫・Debut・HP80（#料理）
 * コラボエフェクト「すうすう…」:
 *   自分が後攻で最初のターンで、自分の推しホロメンが〈癒月ちょこ〉なら、自分のデッキを2枚引く。
 * アーツ「ぎゅーってして？」(10): テキスト効果なし。
 */
export default {
  number: 'hBP05-053',
  collabEffect: {
    name: 'すうすう…',
    *run(ctx) {
      if (ctx.isFirstTurnGoingSecond() && ctx.player.oshi?.name === '癒月ちょこ') {
        ctx.draw(2);
      }
    },
  },
};
