/**
 * 博衣こより (hBD24-032) 推しホロメン・白
 *
 * 推しスキル「ホワイトエンハンス」[ホロパワー：-2][ターンに1回]:
 *   このターンの間、自分の白ホロメン1人のアーツ+20。
 *   → oshiSkill（能動）。自分の白ホロメン1人を選び、そのホロメンのアーツ+20の
 *     ターン修正を付与する。match はその選んだホロメンに一致させる。
 *     ※コスト[ホロパワー：-2]・[ターンに1回]制限はエンジンが処理するため run には書かない。
 *
 * SP推しスキル「Birthday Gift ～White～」[ホロパワー：-2][ゲームに1回]:
 *   自分のデッキから、白ホロメン1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → spOshiSkill（能動）。デッキの白ホロメン1枚を選び公開して手札に加え、デッキをシャッフル。
 *     ※コスト[ホロパワー：-2]・[ゲームに1回]制限はエンジンが処理するため run には書かない。
 *
 * 保留: なし
 */
export default {
  number: 'hBD24-032',

  oshiSkill: {
    name: 'ホワイトエンハンス',
    canUse(engine, ownerIdx) {
      // 自分の白ホロメンがいる時のみ意味がある
      const p = engine.state.players[ownerIdx];
      for (const pos of engine._stagePositions(p)) {
        const h = engine._holomemAt(p, pos);
        const top = h && h.stack[0];
        if (top && top.color === '白') return true;
      }
      return false;
    },
    *run(ctx) {
      // 自分の白ホロメン1人を選ぶ
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.top && e.top.color === '白',
        title: 'アーツ+20する白ホロメンを選択',
      });
      if (!target) return;
      const chosen = target.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 20,
        ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターンの間、${chosen.stack[0].name} のアーツ+20`,
      });
    },
  },

  spOshiSkill: {
    name: 'Birthday Gift ～White～',
    canUse(engine, ownerIdx) {
      // デッキに白ホロメンがいる時のみ意味がある
      const p = engine.state.players[ownerIdx];
      return p.deck.some((c) => c.kind === 'holomen' && c.color === '白');
    },
    *run(ctx) {
      const cand = ctx.deckCards((c) => c.kind === 'holomen' && c.color === '白');
      if (cand.length === 0) {
        ctx.shuffleDeck();
        return;
      }
      const picked = yield ctx.chooseCard({
        cards: cand,
        title: '手札に加える白ホロメンを選択',
      });
      // 「公開し、手札に加える」=必須。選ばれなければ（候補があるため通常起きない）シャッフルのみ
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.flashReveal(picked);
        ctx.addToHand(picked);
      }
      // そしてデッキをシャッフルする
      ctx.shuffleDeck();
    },
  },
};
