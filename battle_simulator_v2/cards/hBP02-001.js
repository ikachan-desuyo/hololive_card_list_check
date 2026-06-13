/**
 * 白上フブキ（推しホロメン hBP02-001・白）
 *
 * 推しスキル「マスコット創造」[ホロパワー：2消費][ターンに1回]:
 *   自分のデッキから、マスコット1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → oshiSkill（能動）。デッキはマスコットを検索（非公開領域なので「見つからない」も許容＝optional）、
 *     1枚を公開して手札に加え、最後にデッキをシャッフルする。コスト[ホロパワー：-2]はエンジンが処理。
 *
 * SP推しスキル「フブキングダム」[ホロパワー：2消費][ゲームに1回]:
 *   自分の白ホロメンが相手のホロメンをダウンさせた時、自分のステージのマスコット2枚につき、
 *   サイコロを1回振れる：奇数が1回以上出たなら、相手のライフ-1。
 *   → 【保留】「〜ダウンさせた時」に発動するタイミング割り込み型の推しスキル。
 *     ダウン監視で任意発動する推しスキル割り込み機構が未対応のため未実装。
 */
export default {
  number: 'hBP02-001',

  oshiSkill: {
    name: 'マスコット創造',
    canUse(engine, ownerIdx) {
      // 空振り（コストだけ払う）を避けるため、デッキにマスコットがある時のみ使える
      const p = engine.state.players[ownerIdx];
      return p.deck.some((c) => c.kind === 'support' && c.supportType === 'マスコット');
    },
    *run(ctx) {
      const mascots = ctx.deckCards((c) => c.kind === 'support' && c.supportType === 'マスコット');
      if (mascots.length > 0) {
        const card = yield ctx.chooseCard({
          cards: mascots,
          title: 'デッキから手札に加えるマスコットを選択',
          optional: true,
          skipLabel: '加えない',
        });
        if (card) {
          ctx.removeFromDeck(card);
          ctx.addToHand(card, { reveal: true });
        }
      }
      ctx.shuffleDeck();
    },
  },

  // SP推しスキル「フブキングダム」は「白ホロメンが相手をダウンさせた時」発動の
  // タイミング割り込み型推しスキルのため保留（割り込み機構未対応）。
};
