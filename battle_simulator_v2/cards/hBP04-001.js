/**
 * 博衣こより (hBP04-001) 推しホロメン
 * 推しスキル「こより実験中」[ホロパワー：-2][ターンに1回]:
 *   このターンの間、自分の#こよラボを持つサポートカードが付いている〈博衣こより〉1人のアーツ+30。
 * SP推しスキル「助手くん、んーまっ！」[ホロパワー：-2][ゲームに1回]:
 *   相手のターンで、自分の〈こよりの助手くん〉が付いている〈博衣こより〉が相手からダメージを受ける時に使える：
 *   そのホロメン1人が受けるダメージ-100。
 *   → onDamageOshiSkill（被ダメージ割り込み, sp=ゲーム1回）。アーツダメージへの割り込みのみ対応。
 */
function koyoriWithLab(e) {
  return e.top.name === '博衣こより' &&
    e.holomem.attachments.some((a) => (a.tags || []).includes('こよラボ'));
}

export default {
  number: 'hBP04-001',
  // SP推しスキル「助手くん、んーまっ！」: 〈こよりの助手くん〉付き〈博衣こより〉が受けるダメージ-100（ゲーム1回）
  onDamageOshiSkill: {
    cost: 2,
    sp: true,
    title: 'SP推しスキル「助手くん、んーまっ！」: 受けるダメージ-100しますか？',
    canUse(engine, defIdx, target) {
      return target.stack[0].name === '博衣こより' &&
        target.attachments.some((a) => a.name === 'こよりの助手くん');
    },
    reduce() {
      return 100;
    },
  },
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
