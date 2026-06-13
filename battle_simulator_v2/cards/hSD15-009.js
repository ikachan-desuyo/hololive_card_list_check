/**
 * 儒烏風亭らでん (hSD15-009) 緑・2nd・HP170（#DEV_IS #ReGLOSS #お酒）
 *
 * ブルームエフェクト「ザ・破天荒」:
 *   [センターポジション限定]このターンの間、このホロメンのアーツ+20。
 *   → センターに居る場合のみ、このホロメン自身に artsPlus+20 のターン修正を付与。
 *
 * アーツ「伝統と革新をあなたに」(90) 特攻 青+30:
 *   テキスト効果なし（素点＋特攻アイコンのみ）。特攻はエンジンのアイコン処理に委ねるため定義不要。
 */
export default {
  number: 'hSD15-009',
  bloomEffect: {
    name: 'ザ・破天荒',
    *run(ctx) {
      // [センターポジション限定]
      if (ctx.engine._zoneOf(ctx.sourceHolomem) !== 'center') return;
      const self = ctx.sourceHolomem;
      // このターンの間、このホロメンのアーツ+20
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 20,
        ownerIdx: ctx.playerIdx,
        match: (h) => h === self,
        description: 'このターン、このホロメンのアーツ+20',
      });
    },
  },
};
