/**
 * 風真いろは (hSD06-001) 推しホロメン・緑
 *
 * 推しスキル「グリーンマイク」[ホロパワー：-2][ターンに1回]:
 *   このターンの間、自分の緑センターホロメンのアーツ+20。
 *   → oshiSkill（能動）。センターホロメンが緑である間アーツ+20するターン修正を付与。
 *     match はセンターであり、かつ現在のトップカードの色が緑である場合に一致させる
 *     （ブルームで色が変わる/センターが入れ替わる可能性に動的対応）。
 *     ※コスト[ホロパワー：-2]はエンジン側が処理するため run には書かない。
 *
 * SP推しスキル「みんな頑張ろー！」[ホロパワー：-1][ゲームに1回]:
 *   自分の緑ホロメン全員のHP20回復。
 *   → spOshiSkill（能動）。ステージ上の緑ホロメン全員をそれぞれHP20回復。
 *     ※コスト[ホロパワー：-1]はエンジン側が処理するため run には書かない。
 */
export default {
  number: 'hSD06-001',

  oshiSkill: {
    name: 'グリーンマイク',
    canUse(engine, ownerIdx) {
      // 緑センターホロメンがいる時のみ意味がある
      const p = engine.state.players[ownerIdx];
      const center = p.center;
      if (!center) return false;
      const top = center.stack[0];
      return !!top && top.color === '緑';
    },
    *run(ctx) {
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 20,
        ownerIdx: ctx.playerIdx,
        // 「自分の緑センターホロメン」: その時点でセンターであり、トップカードの色が緑であるもの
        match: (h) => h === ctx.player.center && h.stack[0] && h.stack[0].color === '緑',
        description: 'このターンの間、自分の緑センターホロメンのアーツ+20',
      });
    },
  },

  spOshiSkill: {
    name: 'みんな頑張ろー！',
    canUse(engine, ownerIdx) {
      // 緑ホロメンが居て、かつダメージを受けているものがある時に意味がある
      const p = engine.state.players[ownerIdx];
      for (const pos of engine._stagePositions(p)) {
        const h = engine._holomemAt(p, pos);
        const top = h && h.stack[0];
        if (top && top.color === '緑' && h.damage > 0) return true;
      }
      return false;
    },
    *run(ctx) {
      // 自分の緑ホロメン全員のHP20回復
      const greens = ctx.holomems('self', (e) => e.top && e.top.color === '緑');
      for (const e of greens) {
        ctx.heal(e.holomem, 20);
      }
    },
  },
};
