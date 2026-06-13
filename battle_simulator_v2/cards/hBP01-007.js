/**
 * 星街すいせい (hBP01-007) 推しホロメン 青 ライフ5
 * 推しスキル「ほうき星」[ホロパワー-2][ターンに1回]:
 *   この推しホロメンか自分の青ホロメンが相手のバックホロメンにダメージを与えた時に使える：
 *   その相手のバックホロメン1人に特殊ダメージ50を与える。
 *   → onDamageDealtOshiSkills（攻撃時誘発。青ホロメンが相手バックに与えた時、そのバックへ特殊50）。
 * SP推しスキル「シューティングスター」[ホロパワー-2][ゲームに1回]:
 *   自分の青ホロメンが相手のセンターホロメンかコラボホロメンにダメージを与えた時に使える：
 *   相手のバックホロメン1人にそれと同じ数値の特殊ダメージを与える。
 *   → onDamageDealtOshiSkills（青ホロメンが前衛に与えた時、その数値と同じ特殊を相手バック1人へ）。
 */
export default {
  number: 'hBP01-007',
  onDamageDealtOshiSkills: [
    {
      cost: 2,
      title: '推しスキル「ほうき星」: ダメージを受けた相手バックへ特殊ダメージ50？（ホロパワー-2）',
      canUse(engine, idx, info) {
        const sh = info.sourceHolomem;
        if (!sh || sh.stack[0].color !== '青') return false;        // 自分の青ホロメンが与えた
        return (info.dealtList || []).some((d) => d.zone === 'back'); // 相手バックにダメージ
      },
      *run(ctx) {
        const dealtBacks = new Set((ctx.attackInfo.dealtList || []).filter((d) => d.zone === 'back').map((d) => d.target));
        const entry = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => dealtBacks.has(e.holomem),
          title: '特殊ダメージ50を与える相手のバックホロメンを選択',
        });
        if (entry) yield* ctx.dealSpecialDamage(entry, 50);
      },
    },
    {
      cost: 2,
      sp: true,
      title: 'SP推しスキル「シューティングスター」: 与えたダメージと同じ数値を相手バックへ特殊ダメージ？（ホロパワー-2）',
      canUse(engine, idx, info) {
        const sh = info.sourceHolomem;
        if (!sh || sh.stack[0].color !== '青') return false;          // 自分の青ホロメンが与えた
        if (!(info.dealtList || []).some((d) => d.zone === 'center' || d.zone === 'collab')) return false;
        return engine.state.players[1 - idx].back.length > 0;          // 相手にバックがいる
      },
      *run(ctx) {
        const amount = (ctx.attackInfo.dealtList || [])
          .filter((d) => d.zone === 'center' || d.zone === 'collab')
          .reduce((sum, d) => sum + d.dealt, 0);
        if (amount <= 0) return;
        const entry = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.pos.zone === 'back',
          title: `特殊ダメージ${amount}を与える相手のバックホロメンを選択`,
        });
        if (entry) yield* ctx.dealSpecialDamage(entry, amount);
      },
    },
  ],
};
