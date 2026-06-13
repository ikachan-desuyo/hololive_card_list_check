/**
 * 赤井はあと 1st (hBP03-033) 赤・HP120（JP/1期生/料理）
 * ブルームエフェクト「全力でいくぞおおお！」:
 *   相手のセンターホロメンに特殊ダメージ10を与える。
 *   その相手のセンターホロメンにツールが付いている時、かわりに、特殊ダメージ30を与える。
 * アーツ「はあちゃまっちゃま～！」(dmg:40):
 *   テキスト効果なし（通常ダメージのみ）のため定義不要。
 */
export default {
  number: 'hBP03-033',
  bloomEffect: {
    name: '全力でいくぞおおお！',
    *run(ctx) {
      const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
      if (!center) return;
      const hasTool = center.holomem.attachments.some((a) => a.supportType === 'ツール');
      yield* ctx.dealSpecialDamage(center, hasTool ? 30 : 10);
    },
  },
};
