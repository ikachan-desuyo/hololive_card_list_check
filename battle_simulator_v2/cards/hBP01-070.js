/**
 * 尾丸ポルカ (hBP01-070) 赤・1st・HP110（#JP #5期生 #ケモミミ）
 *
 * ブルームエフェクト「宴の始まりだ！」:
 *   自分のデッキから、ファン1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → デッキ検索（hBP03-007 / hBP03-089 と同型）。デッキにファンが無くてもシャッフルは行う。
 *
 * アーツ「共依存」(70):
 *   「このアーツは、このホロメンに〈座員〉が付いていないと使えない。」
 *   → arts.canUse で実装（engine がアーツ提示時に評価）。〈座員〉が付いていなければ使用不可。
 */
const FAN_FILTER = (c) => c.kind === 'support' && c.supportType === 'ファン';

export default {
  number: 'hBP01-070',
  bloomEffect: {
    name: '宴の始まりだ！',
    *run(ctx) {
      const cand = ctx.deckCards(FAN_FILTER);
      const picked = yield ctx.chooseCard({
        cards: cand,
        title: 'デッキからファン1枚を公開して手札に加える',
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
    // 「共依存」: このホロメンに〈座員〉が付いていないと使えない（ダメージ70はエンジン処理）
    '共依存': {
      canUse(ctx) {
        return (ctx.sourceHolomem?.attachments || []).some((a) => a.name === '座員');
      },
    },
  },
};
