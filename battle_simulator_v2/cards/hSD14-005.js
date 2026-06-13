/**
 * 白上フブキ (hSD14-005) 白・Debut・HP100（#JP #1期生 #ゲーマーズ #ケモミミ #絵）
 * コラボエフェクト「いっちにー、さんしー」:
 *   自分のセンターホロメンを選ぶ。このターンの間、選んだホロメンのアーツ+10。
 *   → センターのホロメンを選び、そのホロメンに artsPlus+10 のターン修正を付与する。
 * アーツ「いつでもいけるよ！」(20): テキスト効果なし（基礎ダメージのみ）。
 *
 * 保留: なし
 */
export default {
  number: 'hSD14-005',
  collabEffect: {
    name: 'いっちにー、さんしー',
    *run(ctx) {
      // 自分のセンターホロメンを選ぶ
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.pos.zone === 'center',
        title: 'このターン アーツ+10する自分のセンターホロメンを選択',
      });
      if (!target) return;
      const chosen = target.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 10,
        ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターン、${chosen.stack[0].name} のアーツ+10`,
      });
    },
  },
  arts: {
    'いつでもいけるよ！': {
      // 追加効果なし（基礎ダメージのみ）
    },
  },
};
