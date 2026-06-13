/**
 * 宝鐘マリン (hSD09-002) 赤・Debut・HP100（#JP #3期生 #絵 #海 #サマー）
 * コラボエフェクト「ホロサマー」:
 *   自分のデッキの上から5枚を見る。その中から、#サマーを持つDebutホロメン1枚を公開し、手札に加える。
 *   そして残ったカードを好きな順でデッキの下に戻す。
 * アーツ「船長も一緒にい・か・が？」(dmg:20):
 *   テキスト効果なし（素点のみ）のため arts 定義は不要。
 */
export default {
  number: 'hSD09-002',
  collabEffect: {
    name: 'ホロサマー',
    *run(ctx) {
      const looked = ctx.lookTopDeck(5);
      if (looked.length === 0) return;
      // #サマーを持つDebutホロメンのみ選択可能（残りは見せるだけ）
      const candidates = looked.filter(
        (c) => c.kind === 'holomen' && c.bloomLevel === 'Debut' && ctx.hasTag(c, 'サマー'),
      );
      let rest = [...looked];
      if (candidates.length > 0) {
        const picked = yield ctx.chooseCard({
          cards: candidates,
          displayCards: looked,
          title: '手札に加える #サマー Debutホロメンを選択（任意）',
          optional: true,
          skipLabel: '加えない',
        });
        if (picked) {
          rest = rest.filter((c) => c !== picked);
          ctx.addToHand(picked, { reveal: true });
        }
      }
      // 残ったカードを好きな順でデッキの下に戻す
      if (rest.length > 0) {
        const ordered = yield* ctx.orderCardsFlow(rest, 'デッキの下に戻す順番');
        ctx.deckToBottom(ordered);
      }
    },
  },
};
