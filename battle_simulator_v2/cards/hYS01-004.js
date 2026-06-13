/**
 * 星街すいせい (hYS01-004) 推しホロメン・青 ライフ5
 *
 * 推しスキル「ブルーバトン」[ホロパワー：-2][ターンに1回]:
 *   このターンの間、自分の青コラボホロメンのアーツ+20。
 *   → oshiSkill（能動）。コスト[ホロパワー：-2]はエンジンが処理するため run には書かない。
 *     自分のコラボが青ホロメンの時のみ、このターンの間そのコラボのアーツ+20。
 *     ※コラボ不在、または青でないなら修正は付かない（テキスト「青コラボホロメンの」）。
 *     コラボは1枠なので、評価時にコラボ位置の青ホロメンに一致させる。
 *
 * SP推しスキル「バックショット」[ホロパワー：-1][ゲームに1回]:
 *   自分のホロメンが相手のバックホロメンにダメージを与えた時に使える：
 *   その相手のバックホロメン1人に特殊ダメージ50を与える。
 *   → onDamageDealtOshiSkills（sp=ゲームに1回。攻撃時誘発）。
 *     色指定は無い（「自分のホロメン」全般）。相手バックにダメージを与えた時に発火し、
 *     ダメージを与えた相手バックの中から1人に特殊ダメージ50。
 */
export default {
  number: 'hYS01-004',

  // 推しスキル「ブルーバトン」: このターン、自分の青コラボのアーツ+20
  oshiSkill: {
    name: 'ブルーバトン',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // 自分のコラボが青ホロメンの時のみ意味がある
      return !!p.collab && p.collab.stack[0].color === '青';
    },
    *run(ctx) {
      const collab = ctx.player.collab;
      if (collab && collab.stack[0].color === '青') {
        ctx.addTurnModifier({
          kind: 'artsPlus', amount: 20, ownerIdx: ctx.playerIdx,
          match: (h) => h === collab,
          description: `このターンの間、${collab.stack[0].name}（青コラボ）のアーツ+20`,
        });
      }
    },
  },

  // SP推しスキル「バックショット」: 相手バックにダメージを与えた時、その相手バックへ特殊ダメージ50（ゲームに1回）
  onDamageDealtOshiSkills: [
    {
      cost: 1,
      sp: true,
      title: 'SP推しスキル「バックショット」: ダメージを与えた相手バックへ特殊ダメージ50？（ホロパワー-1 / ゲームに1回）',
      canUse(engine, idx, info) {
        if (!info.sourceHolomem) return false;            // 自分のホロメンが与えた
        return (info.dealtList || []).some((d) => d.zone === 'back'); // 相手バックにダメージ
      },
      *run(ctx) {
        const dealtBacks = new Set(
          (ctx.attackInfo.dealtList || []).filter((d) => d.zone === 'back').map((d) => d.target));
        const entry = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => dealtBacks.has(e.holomem),
          title: '特殊ダメージ50を与える相手のバックホロメンを選択',
        });
        if (entry) yield* ctx.dealSpecialDamage(entry, 50);
      },
    },
  ],
};
