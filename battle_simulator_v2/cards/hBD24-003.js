/**
 * 戌神ころね（推しホロメン hBD24-003・黄）
 *
 * 推しスキル「イエローエンハンス」[ホロパワー：-2][ターンに1回]:
 *   このターンの間、自分の黄ホロメン1人のアーツ+20。
 *   → oshiSkill（能動）。黄のホロメンを1人選び、artsPlus +20 のターン修正を付与する。
 *
 * SP推しスキル「Birthday Gift ～Yellow～」[ホロパワー：-2][ゲームに1回]:
 *   自分のデッキから、黄ホロメン1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → spOshiSkill（能動）。デッキ内の黄ホロメンを1枚選び手札へ（公開）、その後シャッフル。
 *
 * 保留: なし
 */
export default {
  number: 'hBD24-003',
  oshiSkill: {
    name: 'イエローエンハンス',
    canUse(engine, ownerIdx) {
      // 自分の黄ホロメンが1人以上いる時のみ意味がある
      const p = engine.state.players[ownerIdx];
      return engine._stageHolomems(p).some((h) => h.stack[0].color === '黄');
    },
    *run(ctx) {
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.top.color === '黄',
        title: 'アーツ+20する自分の黄ホロメンを選択',
      });
      if (!target) return;
      const chosen = target.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus', amount: 20, ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターンの間、${chosen.stack[0].name}（黄）のアーツ+20`,
      });
    },
  },
  spOshiSkill: {
    name: 'Birthday Gift ～Yellow～',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      return p.deck.some((c) => c.kind === 'holomen' && c.color === '黄');
    },
    *run(ctx) {
      const cand = ctx.deckCards((c) => c.kind === 'holomen' && c.color === '黄');
      if (cand.length === 0) {
        ctx.log(`${ctx.player.name}: デッキに黄ホロメンが無い`);
        ctx.shuffleDeck();
        return;
      }
      const picked = yield ctx.chooseCard({
        cards: cand,
        title: 'デッキから黄ホロメン1枚を公開し手札に加える',
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.flashReveal(picked);
        ctx.addToHand(picked, { reveal: true });
      }
      ctx.shuffleDeck();
    },
  },
};
