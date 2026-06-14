/**
 * 轟はじめ (hSD05-008) 白・1st・HP230 Buzzホロメン（#DEV_IS #ReGLOSS #ベイビー）
 * アーツ「……なんか、番長っぽくなってきたかも！」(50):
 *   このターンの間、自分のステージの#ReGLOSSを持つDebutホロメン1人のアーツ+40。
 */
export default {
  number: 'hSD05-008',
  arts: {
    '……なんか、番長っぽくなってきたかも！': {
      *run(ctx) {
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => ctx.hasTag(e.top, 'ReGLOSS') && e.top.bloomLevel === 'Debut',
          title: 'このターン アーツ+40する #ReGLOSS Debutホロメンを選択',
          optional: true,
        });
        if (!target) return;
        const chosen = target.holomem;
        ctx.addTurnModifier({
          kind: 'artsPlus', amount: 40, ownerIdx: ctx.playerIdx,
          match: (h) => h === chosen,
          description: `このターン、${chosen.stack[0].name} のアーツ+40`,
        });
      },
    },
  },
};
