/**
 * 戌神ころね（推しホロメン hBP03-006）
 * 推しスキル「無限の体力」[ホロパワー：-2][ターンに1回]:
 *   自分のお休みしている〈戌神ころね〉1人をアクティブにする。
 *   （〈戌神ころね〉= 名前が「戌神ころね」のホロメン）
 *
 * ※SP推しスキル「ウォウウォウウォウウォウ」[ホロパワー：-3][ゲームに1回]は
 *   「自分の黄ホロメンがダウンした時に使える」タイミング割り込み型推しスキルのため未実装。
 *   エンジン側にダウン時の推しスキル発動割り込み機構が無く、規約上の保留対象。
 *   （内容: そのホロメンのエール1枚を他のホロメンに付け替え、ダウンしたホロメンを含め
 *    重なっているホロメンの中から1枚を手札に戻す）
 */

// お休みしている「戌神ころね」（重なりの一番上の名前で判定）
function restingKorone(h) {
  return h && h.rested === true && h.stack[0].name === '戌神ころね';
}

export default {
  number: 'hBP03-006',

  oshiSkill: {
    // お休み中の戌神ころねがいる時だけ使える（空振りでコストを払わない）
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      return engine._stagePositions(p)
        .map((pos) => engine._holomemAt(p, pos))
        .some(restingKorone);
    },
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => restingKorone(e.holomem),
        title: 'アクティブにする、お休み中の〈戌神ころね〉を選択',
      });
      if (!entry) return;
      ctx.setActive(entry.holomem);
      // このターン「無限の体力」でアクティブになった印（hBP06-069 のアーツ+50 が参照）。
      // ホロメン個別に紐づけ、ターン修正なのでエンドステップで自動消滅する。
      ctx.addTurnModifier({
        kind: 'activatedByOshiSkill',
        skillName: '無限の体力',
        ownerIdx: ctx.playerIdx,
        match: (h) => h === entry.holomem,
        description: `${entry.top.name}は「無限の体力」でアクティブになった`,
      });
    },
  },
};
