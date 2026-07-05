/**
 * 夏色まつり (hBP06-073) 黄・Debut・HP110（#JP #1期生 #シューター）
 * コラボエフェクト「いっしょに居てくれる…？」:
 *   自分が後攻で最初のターンで、自分の推しホロメンが〈夏色まつり〉なら、
 *   自分のデッキからLIMITEDのサポートカード1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → collabEffect（isFirstTurnGoingSecond + 推し名一致 + デッキ検索）
 * アーツ「ありがとっ」(10): テキスト効果なし。
 */
export default {
  number: 'hBP06-073',
  collabEffect: {
    name: 'いっしょに居てくれる…？',
    *run(ctx) {
      if (!ctx.isFirstTurnGoingSecond()) return;
      if (ctx.player.oshi?.name !== '夏色まつり') return;
      const cand = ctx.deckCards((c) => c.kind === 'support' && c.limited);
      const picked = yield ctx.chooseCard({
        cards: cand,
        title: '手札に加えるLIMITEDのサポートカードを選択（任意）',
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
