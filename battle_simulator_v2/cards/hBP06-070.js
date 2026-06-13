/**
 * 戌神ころね (hBP06-070) 紫・2nd・HP210（#JP #ゲーマーズ #ケモミミ）
 *
 * キーワード/ギフト「ワンダーヴァイキング」:
 *   [センターポジション限定][ターンに1回] 自分のステージの〈ゆび〉1枚をデッキの下に戻せる：
 *   このターンの間、このホロメンのアーツに必要な無色-2。
 *   → メインステップの起動型能力。コスト=ステージの〈ゆび〉1枚をデッキ下へ。
 *     効果=このターン、このホロメンのアーツ必要エール(無色)-2（artCostReduce ターン修正）。
 *
 * アーツ「終焉のウォウウォウアックス」(170+):
 *   このターンに自分の推しスキル「無限の体力」を使っていたなら、このアーツ+40。
 *   → エンジンは「このターン推しスキルを使ったか(usedOshiSkillThisTurn)」のみ保持するため、
 *     さらに自分の推し（通常）推しスキルが「無限の体力」であることを名前一致で確認して厳密化。
 *     （別の推しを採用している場合はこの条件は成立しない）
 */
export default {
  number: 'hBP06-070',

  activatedAbilities: [{
    name: 'ワンダーヴァイキング',
    oncePerTurn: true,
    canUse(ctx) {
      // [センターポジション限定]
      if (ctx.sourceHolomemPos()?.zone !== 'center') return false;
      // コストとして戻せる〈ゆび〉がステージ上に存在するか
      return ctx.holomems('self').some((e) => e.holomem.attachments.some((a) => a.name === 'ゆび'));
    },
    *run(ctx) {
      // コスト支払い: 自分のステージの〈ゆび〉1枚をデッキの下に戻す
      const yubis = [];
      for (const { holomem } of ctx.holomems('self')) {
        for (const a of holomem.attachments) {
          if (a.name === 'ゆび') yubis.push({ holomem, card: a });
        }
      }
      if (yubis.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: yubis.map((y) => y.card),
        title: 'コスト: デッキの下に戻す〈ゆび〉を選択',
      });
      if (!picked) return;
      const entry = yubis.find((y) => y.card === picked);
      const i = entry.holomem.attachments.indexOf(picked);
      if (i !== -1) entry.holomem.attachments.splice(i, 1);
      ctx.deckToBottom([picked]);

      // 効果: このターンの間、このホロメンのアーツに必要な無色-2
      const me = ctx.sourceHolomem;
      ctx.addTurnModifier({
        kind: 'artCostReduce', color: '無色', amount: 2, ownerIdx: ctx.playerIdx,
        match: (h) => h === me,
        description: `このターン、${me.stack[0].name} のアーツ必要無色-2`,
      });
    },
  }],

  arts: {
    '終焉のウォウウォウアックス': {
      dmgBonus(ctx) {
        const p = ctx.player;
        if (!p.usedOshiSkillThisTurn) return 0;
        // 自分の（通常）推しスキルが「無限の体力」であることを名前一致で確認
        const hasMugen = (p.oshi?.oshiSkills || []).some((s) => !s.sp && /無限の体力/.test(s.text || ''));
        return hasMugen ? 40 : 0;
      },
    },
  },
};
