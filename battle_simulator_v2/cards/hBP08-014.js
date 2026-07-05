/**
 * IRyS (hBP08-014) 白・2nd・HP200（#EN #Promise #歌）
 *
 * ブルームエフェクト「絶望に残った光」:
 *   相手のセンターホロメンに特殊ダメージ30を与える。
 *   さらに、このホロメン（Bloom先のIRyS＝sourceHolomem）に紫エールが付いているなら、
 *   相手のコラボホロメンに特殊ダメージ30を与える。
 *   → 「ライフは減らない」記載が無いため通常の特殊ダメージ（noLifeOnDown 指定なし）。
 *     コラボ追撃は紫エール所持が条件。コラボ不在なら追撃は不発（センターのみ）。
 *
 * アーツ「プリズマティック・アンセム」(130+):
 *   このターンの間、このホロメンの紫エール1枚につき、自分のステージのホロメン全員のアーツ+20。
 *   → 全体 artsPlus。紫エール枚数は解決時の sourceHolomem の cheers から算出する。
 *     紫0枚なら修正なし。tokkou[赤+50] はアイコン情報なのでエンジンが素点処理する。
 *
 * 保留: なし。
 */
const PURPLE = '紫';

export default {
  number: 'hBP08-014',

  bloomEffect: {
    name: '絶望に残った光',
    *run(ctx) {
      const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
      if (center) {
        yield* ctx.dealSpecialDamage(center, 30);
      }
      // このホロメン（Bloom先のIRyS）に紫エールが付いているなら、相手コラボにも特殊30
      const self = ctx.sourceHolomem;
      const hasPurple = self && self.cheers.some((c) => c.color === PURPLE);
      if (hasPurple) {
        const collab = ctx.holomems('opp', (e) => e.pos.zone === 'collab')[0];
        if (collab) {
          yield* ctx.dealSpecialDamage(collab, 30);
        }
      }
    },
  },

  arts: {
    'プリズマティック・アンセム': {
      *run(ctx) {
        const self = ctx.sourceHolomem;
        const purpleCount = self ? self.cheers.filter((c) => c.color === PURPLE).length : 0;
        if (purpleCount <= 0) return;
        const amount = purpleCount * 20;
        ctx.addTurnModifier({
          kind: 'artsPlus',
          amount,
          ownerIdx: ctx.playerIdx,
          match: (h) => ctx.engine._stageHolomems(ctx.engine.state.players[ctx.playerIdx]).includes(h),
          description: `このターンの間、自分のステージのホロメン全員のアーツ+${amount}（紫エール${purpleCount}枚）`,
        });
      },
    },
  },
};
