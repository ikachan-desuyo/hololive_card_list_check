/**
 * 博衣こより (hBP04-001) 推しホロメン
 * 推しスキル「こより実験中」[ホロパワー：-2][ターンに1回]:
 *   このターンの間、自分の#こよラボを持つサポートカードが付いている〈博衣こより〉1人のアーツ+30。
 * ※SP推しスキル「助手くん、んーまっ！」は相手ターンの被ダメージ時トリガー（受けるダメージ-100）で、
 *   エンジン側の被ダメージ割り込みが未対応のため未実装。
 */
function koyoriWithLab(e) {
  return e.top.name === '博衣こより' &&
    e.holomem.attachments.some((a) => (a.tags || []).includes('こよラボ'));
}

export default {
  number: 'hBP04-001',
  oshiSkill: {
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      return engine._stagePositions(p)
        .map((pos) => ({ holomem: engine._holomemAt(p, pos), top: engine._holomemAt(p, pos).stack[0] }))
        .some(koyoriWithLab);
    },
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: koyoriWithLab,
        title: 'このターン アーツ+30 する〈博衣こより〉を選択',
      });
      if (!entry) return;
      const chosen = entry.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus', amount: 30, ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターンの間、${chosen.stack[0].name} のアーツ+30`,
      });
    },
  },
};
