/**
 * 癒月ちょこ (hBP02-060) 紫・Buzz・1st・HP240
 * ブルームエフェクト「誘惑の視線」:
 *   自分のバックホロメン1人のHP50回復できる：
 *   相手のセンターホロメンに、回復したダメージ10につき、特殊ダメージ10を与える。
 *   → 「できる」=任意。回復対象を選ばないことも可。
 *      実際に回復したダメージ量(最大50)に応じて、その10ごとに特殊ダメージ10を与える
 *      （回復量は10刻みなので、与える特殊ダメージは回復量と一致する）。
 *      回復対象がいない/回復できるダメージが無い場合は特殊ダメージも0。
 * アーツ「隠しきれない魅力」(80): テキスト効果なし（dmgのみ）。
 */
export default {
  number: 'hBP02-060',
  bloomEffect: {
    name: '誘惑の視線',
    *run(ctx) {
      // バックホロメンの中から回復対象を選ぶ（任意）
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.pos.zone === 'back',
        title: 'HP50回復するバックホロメンを選択（任意）',
        optional: true,
      });
      if (!target) return;

      const before = target.holomem.damage;
      ctx.heal(target.holomem, 50);
      const healed = before - target.holomem.damage; // 実際に回復したダメージ量
      if (healed <= 0) return;

      // 回復したダメージ10につき特殊ダメージ10
      const dmg = Math.floor(healed / 10) * 10;
      if (dmg <= 0) return;

      const oppCenter = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
      if (oppCenter) yield* ctx.dealSpecialDamage(oppCenter, dmg);
    },
  },
  // アーツ「隠しきれない魅力」はテキスト効果を持たない（ダメージのみ）
};
