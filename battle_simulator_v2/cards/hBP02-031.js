/**
 * 宝鐘マリン (hBP02-031) 赤・1st・HP130（#JP #3期生 #絵 #海）
 * ブルームエフェクト「キミたちの声が船長の支えです！」:
 *   相手のコラボホロメンに特殊ダメージ20を与える。
 *   ※コラボホロメンは最大1人。いなければ何もしない（対象を取れないため）。
 * アーツ「いっしょに出航しましょう！」(30): テキスト効果なし（素点のみ）。
 */
export default {
  number: 'hBP02-031',
  bloomEffect: {
    name: 'キミたちの声が船長の支えです！',
    *run(ctx) {
      const collab = ctx.holomems('opp', (e) => e.pos.zone === 'collab')[0];
      if (collab) ctx.dealSpecialDamage(collab, 20);
    },
  },
};
