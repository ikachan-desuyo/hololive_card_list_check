/**
 * ラプラス・ダークネス (hSD06-010) 紫・Debut・HP60（#秘密結社holoX, #シューター）
 * アーツ「狂気の宴」(30+):
 *   [コラボポジション限定]このターンの自分のメインステップに自分のSP推しスキルを
 *   使っていた時、このアーツ+50。
 *
 * 実装メモ:
 *   - 「コラボポジション限定」→ ctx.engine._zoneOf(sourceHolomem) === 'collab' で判定。
 *   - 「このターンの自分のメインステップにSP推しスキルを使っていた」→
 *     ctx.player.spOshiSkillUsedInfo（{ turn, oshiNumber, text }）の turn が現在ターンと
 *     一致するかで判定。相手ターンに使うSP（クイックガード等）はターン番号が異なるため
 *     自動的に除外され、自分ターンに使えるSPはメインステップでの使用になる。
 */
export default {
  number: 'hSD06-010',
  arts: {
    '狂気の宴': {
      dmgBonus(ctx) {
        // コラボポジション限定
        if (ctx.engine._zoneOf(ctx.sourceHolomem) !== 'collab') return 0;
        // このターンに自分のSP推しスキルを使っていたなら +50
        const info = ctx.player.spOshiSkillUsedInfo;
        return info && info.turn === ctx.state.turn ? 50 : 0;
      },
    },
  },
};
