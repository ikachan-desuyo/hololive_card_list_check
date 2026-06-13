/**
 * 白上フブキ (hBP05-068) 黄・Debut・HP110
 * コラボエフェクト「ゆるゆる休養日」:
 *   このホロメンにマスコットが付いているなら、自分のデッキの上から1枚を見る。
 *   そのカードをデッキの上か下に戻す。
 * アーツ「おやつ食べてゲーム最高！」(20): テキスト効果なし。
 */
export default {
  number: 'hBP05-068',
  collabEffect: {
    name: 'ゆるゆる休養日',
    *run(ctx) {
      const hasMascot = ctx.sourceHolomem.attachments.some((a) => a.supportType === 'マスコット');
      if (!hasMascot) return;
      const looked = ctx.lookTopDeck(1);
      if (looked.length === 0) return;
      const card = looked[0];
      const top = yield ctx.confirm(
        `デッキの上を見た: ${card.name} — どちらに戻す？`, 'デッキの上に戻す', 'デッキの下に戻す');
      if (top) ctx.deckToTop([card]);
      else ctx.deckToBottom([card]);
    },
  },
};
