/**
 * こぼ・かなえる 1st (hBP01-085) 青・HP120
 * アーツ「perayaan」(40): テキスト効果なし。
 * アーツ「レインドロップス」(50):
 *   相手のバックホロメン３人に特殊ダメージ10を与える（ダウンしても相手のライフは減らない）。
 *   → 相手のバックにいるホロメン全員（最大3人）に各特殊ダメージ10。対象選択なし。
 */
export default {
  number: 'hBP01-085',
  arts: {
    'レインドロップス': {
      *run(ctx) {
        const backs = ctx.holomems('opp', (e) => e.pos.zone === 'back');
        for (const target of backs) {
          yield* ctx.dealSpecialDamage(target, 10, { noLifeOnDown: true });
        }
      },
    },
  },
};
