/**
 * 轟はじめ (hSD05-003) 白・Debut・HP60（#DEV_IS #ReGLOSS #ベイビー）
 * コラボエフェクト「こんちくわ」:
 *   このターンの間、自分の#ReGLOSSを持つセンターホロメンのアーツ+10。
 *   ※対象はセンターにいる#ReGLOSSホロメン（位置で決まるため選択不要）。
 *    addTurnModifier の match を動的判定にしているので、ターン中にセンターが入れ替わっても
 *    その時点でセンターにいる#ReGLOSSホロメンに+10が適用される。
 * アーツ「お洒落番長」(30): 効果テキストなし（基本ダメージのみ）のため実装不要。
 */
export default {
  number: 'hSD05-003',
  collabEffect: {
    name: 'こんちくわ',
    *run(ctx) {
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 10,
        ownerIdx: ctx.playerIdx,
        match: (h) => ctx.engine._zoneOf(h) === 'center' && ctx.hasTag(h.stack[0], 'ReGLOSS'),
        description: 'このターン、自分の#ReGLOSSセンターホロメンのアーツ+10',
      });
    },
  },
};
