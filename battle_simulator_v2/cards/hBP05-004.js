/**
 * 猫又おかゆ（推しホロメン hBP05-004）青・ライフ5
 *
 * 推しスキル「いっくよー」[ホロパワー：-1][ターンに1回]:
 *   自分のセンターホロメンが〈猫又おかゆ〉なら使える：
 *   相手のホロメン1人に特殊ダメージ10を与える。
 *   → canUse でセンターが〈猫又おかゆ〉かつ相手にホロメンがいることを確認。
 *
 * SP推しスキル「ウマウマ！」[ホロパワー：-3][ゲームに1回]:
 *   相手のセンターホロメンとHPが減っているバックホロメン1人を交代できる。
 *   その後、自分のセンターホロメンが〈猫又おかゆ〉なら、自分のデッキを3枚引く。
 *   → 交代は「できる」=任意。交代対象のバックは damage > 0（HPが減っている）のみ。
 *     交代後（自分のセンターは変化しない）、自分のセンターが〈猫又おかゆ〉なら3ドロー。
 *
 * 保留点: なし
 */
export default {
  number: 'hBP05-004',

  oshiSkill: {
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      if (!p.center || p.center.stack[0].name !== '猫又おかゆ') return false;
      const opp = engine.state.players[1 - ownerIdx];
      return engine._stageHolomems(opp).length > 0; // 相手のホロメンがいること
    },
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'opp',
        title: '特殊ダメージ10を与える相手のホロメンを選択',
      });
      if (!entry) return;
      yield* ctx.dealSpecialDamage(entry, 10);
    },
  },

  spOshiSkill: {
    *run(ctx) {
      const opp = ctx.opponent;
      // 相手のセンターと、HPが減っているバックホロメン1人を交代できる（任意）
      const hasTarget = !!opp.center &&
        opp.back.some((h) => h && h.damage > 0);
      if (hasTarget) {
        const entry = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.pos.zone === 'back' && e.holomem.damage > 0,
          title: '相手のセンターと交代させるバックホロメン（HPが減っている）を選択',
          optional: true,
        });
        if (entry) {
          const i = entry.pos.index;
          const center = opp.center;
          opp.center = opp.back[i];
          opp.back[i] = center;
          ctx.log(`${opp.center.stack[0].name} が相手のセンターに移動（交代）`);
        }
      }
      // その後、自分のセンターホロメンが〈猫又おかゆ〉なら3ドロー
      const self = ctx.player;
      if (self.center && self.center.stack[0].name === '猫又おかゆ') {
        ctx.draw(3);
      }
    },
  },
};
