/**
 * 風真いろは (hBP01-050) 緑・1st・HP140（#JP, #秘密結社holoX）
 *
 * [キーワード/ギフト] 用心棒:
 *   [コラボポジション限定]相手のホロメンのアーツは、自分のコラボホロメンしか対象にできない。
 *   ただし、特殊ダメージは除く。
 *   → 相手アーツの対象制限（割り込み）機構が未実装のため未対応（保留機構）。
 *
 * [アーツ] 元気を全力でお届けします！ (20):
 *   自分のエールデッキの上から1枚を、自分の〈風真いろは〉以外の#秘密結社holoXを持つ
 *   ホロメンに送る。 → 実装済み。
 */
export default {
  number: 'hBP01-050',
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
