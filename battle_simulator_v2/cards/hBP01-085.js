/**
 * こぼ・かなえる 1st (hBP01-085) 青・HP120
 * アーツ「perayaan」(40): テキスト効果なし。
 * アーツ「レインドロップス」(50):
 *   相手のバックホロメン３人に特殊ダメージ10を与える（ダウンしても相手のライフは減らない）。
 *   → バックが3人以下なら全員に、4人以上いる場合は3人を選んで各特殊ダメージ10。
 */
export default {
  number: 'hBP01-085',
  arts: {
    'レインドロップス': {
      *run(ctx) {
        const backs = ctx.holomems('opp', (e) => e.pos.zone === 'back');
        if (backs.length <= 3) {
          // 3人以下なら選択の余地なく全員
          for (const target of backs) {
            yield* ctx.dealSpecialDamage(target, 10, { noLifeOnDown: true });
          }
          return;
        }
        // 4人以上いる場合は3人を選ぶ（「与える」= 強制）
        const used = new Set();
        for (let i = 0; i < 3; i++) {
          const target = yield ctx.chooseHolomem({
            side: 'opp',
            filter: (e) => e.pos.zone === 'back' && !used.has(e.holomem),
            title: `特殊ダメージ10を与える相手のバックホロメンを選択（${i + 1}/3）`,
          });
          if (!target) break;
          used.add(target.holomem);
          yield* ctx.dealSpecialDamage(target, 10, { noLifeOnDown: true });
        }
      },
    },
  },
};
