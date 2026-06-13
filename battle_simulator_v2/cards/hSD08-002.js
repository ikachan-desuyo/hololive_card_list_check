/**
 * 天音かなた (hSD08-002) 白・Debut・HP100（#JP #4期生 #歌 #サマー）
 * コラボエフェクト「ホロサマー」:
 *   自分のデッキの上から5枚を見る。その中から、#サマーを持つDebutホロメン1枚を公開し、
 *   手札に加える。そして残ったカードを好きな順でデッキの下に戻す。
 * アーツ「浴衣似合うでしょ」(20): テキスト効果なし（コンパイラ管理）
 */
export default {
  number: 'hSD08-002',
  collabEffect: {
    name: 'ホロサマー',
    *run(ctx) {
      const looked = ctx.lookTopDeck(5);
      if (looked.length === 0) return;
      // #サマーを持つDebutホロメンのみ手札に加えられる
      const candidates = looked.filter(
        (c) => c.kind === 'holomen' && c.bloomLevel === 'Debut' && ctx.hasTag(c, 'サマー'));
      if (candidates.length > 0) {
        const picked = yield ctx.chooseCard({
          cards: candidates,
          displayCards: looked,
          title: '手札に加える #サマー Debutホロメンを選択',
          optional: true,
          skipLabel: '加えない',
        });
        if (picked) {
          // addToHand が revealed から取り除くので、残りカードのみが looked に残るよう処理
          const i = looked.indexOf(picked);
          if (i !== -1) looked.splice(i, 1);
          ctx.addToHand(picked, { reveal: true });
        }
      }
      // 残ったカードを好きな順でデッキの下に戻す
      if (looked.length > 0) {
        const ordered = yield* ctx.orderCardsFlow(looked, '残りをデッキの下に戻す順番');
        ctx.deckToBottom(ordered);
      }
    },
  },
};
