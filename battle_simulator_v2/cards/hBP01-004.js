/**
 * 兎田ぺこら (hBP01-004) 推しホロメン・緑
 *
 * 推しスキル「野兎たち～」[ホロパワー：-2][ターンに1回]:
 *   相手のターンで、自分のホロメンがダウンした時に使える：
 *   自分のダウンしたホロメン1人の緑エールすべてを、自分の他のホロメンに割り振って付け替える。
 *   → ダウン処理中に使える推しスキル (11.3.1.1) なので onDownOshiSkill.run（対話的）で実装。
 *      ダウンしたホロメン(アーカイブ前の ctx.downedHolomem)の緑エールを、他の自分のホロメンへ割り振る。
 *
 * SP推しスキル「幸運兎」[ホロパワー：-3][ゲームに1回]:
 *   このターンの間、自分のサイコロの目の数すべてを6として扱う。
 *   → spOshiSkill（能動）として実装。
 *      addTurnModifier({kind:'diceFixed', value:6}) を積む。(yield* ctx.rollDice()) が
 *      自分(playerIdx)の diceFixed 修正を参照して目を6に置き換える（context.js rollDice 参照）。
 *      ターン終了時に duration:'turn' の修正は自動消滅する。
 *      コスト[ホロパワー：-3]・[ゲームに1回]はエンジン側で処理するため run 内では書かない。
 */
export default {
  number: 'hBP01-004',

  // 推しスキル「野兎たち～」: 相手のターンで自分のホロメンがダウンした時、緑エール全てを他のホロメンに付け替える
  onDownOshiSkill: {
    cost: 2,
    title: '推しスキル「野兎たち～」: ダウンしたホロメンの緑エールを他のホロメンに付け替えますか？',
    canUse(engine, ownerIdx, downedHolomem) {
      const p = engine.state.players[ownerIdx];
      return engine.state.turnPlayer !== ownerIdx &&        // 相手のターン
        !p.usedOshiSkillThisTurn &&                          // ターンに1回
        p.holoPower.length >= 2 &&                           // [ホロパワー：-2]
        downedHolomem.cheers.some((c) => c.color === '緑') && // 付け替える緑エールがある
        engine._stageHolomems(p).some((x) => x !== downedHolomem); // 付け替え先がいる
    },
    *run(ctx) {
      const downed = ctx.downedHolomem;
      if (!downed) return;
      const greens = downed.cheers.filter((c) => c.color === '緑');
      for (const cheer of [...greens]) {
        if (ctx.holomems('self', (e) => e.holomem !== downed).length === 0) break;
        const entry = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => e.holomem !== downed,
          title: `緑エール ${cheer.name} を付け替える自分のホロメンを選択`,
        });
        if (!entry) break;
        ctx.moveCheer(cheer, downed, entry.holomem);
      }
    },
  },

  spOshiSkill: {
    name: '幸運兎',
    *run(ctx) {
      ctx.addTurnModifier({
        kind: 'diceFixed',
        value: 6,
        ownerIdx: ctx.playerIdx,
        description: 'このターンの間、自分のサイコロの目をすべて6として扱う',
      });
    },
  },
};
