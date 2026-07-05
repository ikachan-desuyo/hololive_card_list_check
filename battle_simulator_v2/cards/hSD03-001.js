/**
 * 猫又おかゆ (hSD03-001) 推しホロメン・青
 *
 * 推しスキル「ブルーマイク」[ホロパワー：2消費][ターンに1回]:
 *   このターンの間、自分の青センターホロメンのアーツ+20。
 *   → oshiSkill（能動）。「青センターホロメン」を動的に判定する artsPlus 修正を付与する。
 *     対象は「自分のセンター かつ 色が青」のホロメン。修正は match で毎回判定するため、
 *     センターが入れ替わっても常に「青センター」へ追従する（テキストどおりの解釈）。
 *     ※コスト[ホロパワー：2消費]はエンジン側が処理するため run には書かない。
 *
 * SP推しスキル「バックショット」[ホロパワー：1消費][ゲームに1回]:
 *   自分のステージのホロメンが相手のバックホロメンにダメージを与えた時に使える：
 *   その相手のバックホロメン1人に特殊ダメージ50を与える。
 *   → onDamageDealtOshiSkills（攻撃時誘発・sp）で実装。アーツが相手バックにダメージを与えていたら
 *     （attackInfo.dealtList に zone==='back'）、相手バック1人に特殊50。hBP01-007 と同形。
 */
export default {
  number: 'hSD03-001',
  // SP推しスキル「バックショット」: 相手のバックに与えた時、相手バック1人に特殊50（ゲームに1回）
  onDamageDealtOshiSkills: [
    {
      cost: 1,
      sp: true,
      title: 'SP推しスキル「バックショット」: 相手のバックホロメン1人に特殊ダメージ50を与えますか？',
      canUse(engine, ownerIdx, info) {
        return (info.dealtList || []).some((d) => d.zone === 'back');
      },
      *run(ctx) {
        if (ctx.holomems('opp', (e) => e.pos.zone === 'back').length === 0) return;
        const entry = yield ctx.chooseHolomem({
          side: 'opp', filter: (e) => e.pos.zone === 'back',
          title: '特殊ダメージ50を与える相手のバックホロメンを選択',
        });
        if (entry) yield* ctx.dealSpecialDamage(entry, 50);
      },
    },
  ],
  oshiSkill: {
    name: 'ブルーマイク',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // 青のセンターホロメンがいる時のみ意味がある
      return !!(p.center && p.center.stack[0].color === '青');
    },
    *run(ctx) {
      const engine = ctx.engine;
      const ownerIdx = ctx.playerIdx;
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 20,
        ownerIdx,
        // 「自分の青センターホロメン」を動的に判定（センター入れ替えに追従）
        match: (h) => {
          const p = engine.state.players[ownerIdx];
          return p.center === h && h.stack[0].color === '青';
        },
        description: 'このターンの間、自分の青センターホロメンのアーツ+20',
      });
    },
  },
};
