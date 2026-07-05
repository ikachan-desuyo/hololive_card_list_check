/**
 * ラプラス・ダークネス (hSD06-010) 紫・Debut・HP60（#秘密結社holoX, #シューター）
 * アーツ「狂気の宴」(30+):
 *   [コラボポジション限定]このターンの自分のメインステップに自分のSP推しスキルを
 *   使っていた時、このアーツ+50。
 *
 * 実装メモ:
 *   - 「コラボポジション限定」→ ctx.engine._zoneOf(sourceHolomem) === 'collab' で判定。
 *   - 「このターンの自分のメインステップにSP推しスキルを使っていた」条件について、
 *     エンジンが追跡しているのはゲーム単位の usedSpOshiSkillThisGame のみで、
 *     「このターン使ったか」を厳密に判定する per-turn フラグが無い。
 *     SP推しスキルは1ゲームに1回しか使えないため、フラグが立つのは実際に使った1ターンだけ
 *     だが、それ以降のターンでも立ちっぱなしになる。よって本来「使ったそのターンのみ」+50の
 *     ところを「SP使用後の全ターンで」+50と過剰適用する近似実装になっている（厳密には不正確）。
 *     per-turn の SP使用追跡が入ったら usedSpOshiSkillThisTurn 等に差し替えること。
 */
export default {
  number: 'hSD06-010',
  arts: {
    '狂気の宴': {
      dmgBonus(ctx) {
        // コラボポジション限定
        if (ctx.engine._zoneOf(ctx.sourceHolomem) !== 'collab') return 0;
        // このターン（近似: このゲーム）SP推しスキルを使っていたなら +50
        return ctx.player.usedSpOshiSkillThisGame ? 50 : 0;
      },
    },
  },
};
