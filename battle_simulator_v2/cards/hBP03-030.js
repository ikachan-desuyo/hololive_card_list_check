/**
 * さくらみこ (hBP03-030) 赤・2nd・HP200（#JP #0期生 #ベイビー）
 *
 * キーワード/ギフト「エリートギャンブル」:
 *   [センターポジション限定][ターンに1回]自分のメインステップで、このホロメンに〈35P〉が付いている時、
 *   サイコロを1回振れる：3か5の時、このターンの間、このホロメンのアーツ+50。
 *   → メインステップの起動型能力。コスト無し（サイコロを振る能力）。3/5なら artsPlus +50（このホロメン限定・ターン中）。
 *
 * アーツ「エリート巫女」(120+):
 *   このホロメンに付いている〈35P〉1枚につき、このアーツ+20。
 *   ※特攻〈緑+50〉はエンジン側で処理されるためここでは扱わない。
 */
const count35P = (holomem) => (holomem?.cheers || []).filter((c) => c.name === '35P').length;

export default {
  number: 'hBP03-030',
  activatedAbilities: [{
    name: 'エリートギャンブル',
    oncePerTurn: true, // [ターンに1回]
    canUse(ctx) {
      // [センターポジション限定]
      if (ctx.sourceHolomemPos()?.zone !== 'center') return false;
      // このホロメンに〈35P〉が付いている時
      return count35P(ctx.sourceHolomem) > 0;
    },
    *run(ctx) {
      const value = ctx.rollDice();
      if (value === 3 || value === 5) {
        const me = ctx.sourceHolomem;
        ctx.addTurnModifier({
          kind: 'artsPlus', amount: 50, ownerIdx: ctx.playerIdx,
          match: (h) => h === me,
          description: `このターン、${me.stack[0].name} のアーツ+50（エリートギャンブル）`,
        });
      }
    },
  }],
  arts: {
    'エリート巫女': {
      dmgBonus(ctx) {
        return count35P(ctx.sourceHolomem) * 20;
      },
    },
  },
};
