/**
 * 戌神ころね（推しホロメン hBP03-006）
 * 推しスキル「無限の体力」[ホロパワー：-2][ターンに1回]:
 *   自分のお休みしている〈戌神ころね〉1人をアクティブにする。
 *   （〈戌神ころね〉= 名前が「戌神ころね」のホロメン）
 *
 * SP推しスキル「ウォウウォウウォウウォウ」[ホロパワー：-3][ゲームに1回]:
 *   自分の黄ホロメンがダウンした時に使える（ターン制限なし）：
 *   そのホロメンのエール1枚を自分の他のホロメンに付け替え、
 *   ダウンしたホロメンを含め重なっているホロメンの中から1枚を手札に戻す。
 *   → ダウン処理中に使えるSP推しスキル (11.3.1.1) として onDownOshiSkill(sp:true).run で実装。
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

  // SP推しスキル「ウォウウォウウォウウォウ」: 自分の黄ホロメンがダウンした時（ターン制限なし）
  onDownOshiSkill: {
    sp: true,
    cost: 3,
    title: 'SP推しスキル「ウォウウォウウォウウォウ」: エール1枚を付け替え、重なっているホロメン1枚を手札に戻しますか？',
    canUse(engine, ownerIdx, downedHolomem) {
      const p = engine.state.players[ownerIdx];
      return !p.usedSpOshiSkillThisGame &&                   // ゲームに1回
        p.holoPower.length >= 3 &&                           // [ホロパワー：-3]
        downedHolomem.stack[0].color === '黄';               // 黄ホロメン
    },
    *run(ctx) {
      const downed = ctx.downedHolomem;
      if (!downed) return;
      // 1) そのホロメンのエール1枚を自分の他のホロメンに付け替え
      const others = ctx.holomems('self', (e) => e.holomem !== downed);
      if (downed.cheers.length > 0 && others.length > 0) {
        const cheer = downed.cheers.length === 1
          ? downed.cheers[0]
          : yield ctx.chooseCard({ cards: [...downed.cheers], title: '付け替えるエール1枚を選択', optional: true });
        if (cheer) {
          const entry = yield ctx.chooseHolomem({
            side: 'self', filter: (e) => e.holomem !== downed,
            title: `${cheer.name} を付け替える自分のホロメンを選択`,
          });
          if (entry) ctx.moveCheer(cheer, downed, entry.holomem);
        }
      }
      // 2) 重なっているホロメン（スタック）の中から1枚を手札に戻す
      if (downed.stack.length > 0) {
        const card = downed.stack.length === 1
          ? downed.stack[0]
          : yield ctx.chooseCard({ cards: [...downed.stack], title: '手札に戻すホロメンを選択（重なっているカード）' });
        if (card) {
          const idx = downed.stack.indexOf(card);
          if (idx !== -1) downed.stack.splice(idx, 1);
          ctx.addToHand(card);
        }
      }
    },
  },
};
