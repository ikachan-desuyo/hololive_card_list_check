/**
 * 火威青 (hSD05-012) 青・Debut・HP70（#DEV_IS #ReGLOSS #絵）
 * コラボエフェクト「ドーンッ！」:
 *   相手のセンターホロメンかバックホロメン1人に特殊ダメージ10を与える。
 * アーツ「世界一かわいいよ」(20): 追加効果なし（コンパイラ/エンジンの素のアーツ処理で十分）。
 */
export default {
  number: 'hSD05-012',
  collabEffect: {
    name: 'ドーンッ！',
    *run(ctx) {
      // 対象は相手のセンターまたはバックのホロメン（コラボは対象外）
      const targets = ctx.holomems('opp', (e) => e.pos.zone === 'center' || e.pos.zone === 'back');
      if (targets.length === 0) return;
      const target = yield ctx.chooseHolomem({
        side: 'opp',
        filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'back',
        title: '特殊ダメージ10を与える相手のセンターかバックのホロメンを選択',
      });
      if (target) yield* ctx.dealSpecialDamage(target, 10);
    },
  },
};
