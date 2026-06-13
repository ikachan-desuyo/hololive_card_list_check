/**
 * 尾丸ポルカ (hBP01-070) 赤・1st・HP110（#JP #5期生 #ケモミミ）
 *
 * ブルームエフェクト「宴の始まりだ！」:
 *   自分のデッキから、ファン1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → デッキ検索（hBP03-007 / hBP03-089 と同型）。デッキにファンが無くてもシャッフルは行う。
 *
 * アーツ「共依存」(70):
 *   「このアーツは、このホロメンに〈座員〉が付いていないと使えない。」
 *   → アーツ単位の使用可否(canUse)を判定するフックがエンジンに無いため、この使用制限は
 *     強制されない（hBP06-039 と同じ事情）。アーツ自体に追加効果は無く、ダメージ70は
 *     エンジンが通常処理するため arts に run/dmgBonus は不要。制限のみ未実装。
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
  // アーツ「共依存」の使用制限（〈座員〉が付いていないと使えない）は
  // アーツ単位 canUse フックが無いため未実装。
};
