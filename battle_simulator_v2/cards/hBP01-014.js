/**
 * 天音かなた (hBP01-014) 白・2nd・HP200（#JP #4期生 #歌）
 *
 * コラボエフェクト「堕ちた天使」:
 *   相手のセンターホロメンに特殊ダメージ50を与える。
 *
 * アーツ「♰漆黒の翼♰」 dmg:100（特攻 赤+50）:
 *   このアーツで相手のホロメンをダウンさせた時、与えたダメージが残りHPを50以上
 *   オーバーしていれば、相手のライフ-１。
 *
 * 実装方針:
 *   - コラボは相手センターへ特殊ダメージ50（dealSpecialDamage）。
 *   - アーツの追加効果は「このアーツでダウンさせた時」なので onDownDealt で実装。
 *     onDownDealt は target を ctx に渡さないため、ダウンが確定した相手ホロメン
 *     （damage >= 実効HP）を探す。本アーツは単体対象なので、このタイミングで
 *     新たに実効HP以上になっているのは攻撃対象のみ。
 *     「与えたダメージが残りHPを50以上オーバー」= 累計ダメージ - 実効HP >= 50
 *     （攻撃前の残りHP = 実効HP - 攻撃前ダメージ、超過分 = 累計ダメージ - 実効HP）。
 *   - 「相手のライフ-1」は opponent.lifeDamage を加算し、アーツ解決後の _checkTiming
 *     （11.5 ライフダメージ処理）に合流させる（hBP07-069 と同じ機構）。
 *     これはダウンによる通常のライフダメージとは別の追加ライフダメージ。
 */
export default {
  number: 'hBP01-014',
  collabEffect: {
    name: '堕ちた天使',
    *run(ctx) {
      const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
      if (!center) return;
      ctx.dealSpecialDamage(center, 50);
    },
  },
  arts: {
    '♰漆黒の翼♰': {
      // 「このアーツで相手のホロメンをダウンさせた時」→ エンジンが onDownDealt を発火（ダメージ適用後）
      *onDownDealt(ctx) {
        // ダウンが確定した相手ホロメン（実効HP以上のダメージ）を探す
        const downed = ctx.holomems('opp', (e) =>
          e.holomem.damage >= ctx.engine.effectiveHp(e.holomem));
        // 与えたダメージが残りHPを50以上オーバー（= 累計ダメージ - 実効HP >= 50）か判定
        const overflow = downed.some((e) =>
          e.holomem.damage - ctx.engine.effectiveHp(e.holomem) >= 50);
        if (!overflow) return;
        ctx.opponent.lifeDamage += 1;
        ctx.log('「♰漆黒の翼♰」: 残りHPを50以上オーバーしてダウンさせた → 相手のライフ-1');
      },
    },
  },
};
