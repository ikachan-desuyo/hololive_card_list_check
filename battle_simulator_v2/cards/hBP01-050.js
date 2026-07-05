/**
 * 風真いろは (hBP01-050) 緑・1st・HP140（#JP, #秘密結社holoX）
 *
 * [キーワード/ギフト] 用心棒:
 *   [コラボポジション限定]相手のホロメンのアーツは、自分のコラボホロメンしか対象にできない。
 *   ただし、特殊ダメージは除く。
 *   → oppArtsTargetRestrict で実装（hBP05-010 と同形）。このホロメンがコラボにいる間、
 *     相手のアーツ対象を自分のコラボに限定（['collab']を返す）。特殊ダメージは対象制限の対象外（別経路）。
 *
 * [アーツ] 元気を全力でお届けします！ (20):
 *   自分のエールデッキの上から1枚を、自分の〈風真いろは〉以外の#秘密結社holoXを持つ
 *   ホロメンに送る。 → 実装済み。
 */
export default {
  number: 'hBP01-050',
  // ギフト「用心棒」: [コラボ限定]相手のアーツは自分のコラボしか対象にできない（特殊ダメージは別経路で対象外）
  oppArtsTargetRestrict(src, engine) {
    if (engine._zoneOf(src) !== 'collab') return null; // [コラボポジション限定]
    return ['collab'];
  },
  arts: {
    '元気を全力でお届けします！': {
      *run(ctx) {
        if (ctx.player.cheerDeck.length === 0) return;
        const targets = ctx.holomems(
          'self',
          (e) => ctx.hasTag(e.top, '秘密結社holoX') && e.top.name !== '風真いろは',
        );
        if (targets.length === 0) return;
        const chosen = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => ctx.hasTag(e.top, '秘密結社holoX') && e.top.name !== '風真いろは',
          title: 'エールデッキの上から1枚を送る #秘密結社holoX ホロメンを選択',
        });
        if (!chosen) return;
        ctx.sendCheerFromCheerDeckTop(chosen.holomem);
      },
    },
  },
};
