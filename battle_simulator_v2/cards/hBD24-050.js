/**
 * 角巻わため (hBD24-050) 推しホロメン・黄
 *
 * 推しスキル「イエローエンハンス」[ホロパワー：-2][ターンに1回]:
 *   このターンの間、自分の黄ホロメン1人のアーツ+20。
 *   → oshiSkill（能動）。自分の黄ホロメン（トップカードの色が黄）を1人選び、
 *     そのホロメン限定で「このターンの間アーツ+20」のターン修正を付与する。
 *     match は選んだホロメン実体に一致させる（ブルーム/移動しても同じスタックを追う）。
 *     ※コスト[ホロパワー：-2]・[ターンに1回]制限はエンジンが処理するため run には書かない。
 *
 * SP推しスキル「Birthday Gift ～Yellow～」[ホロパワー：-2][ゲームに1回]:
 *   自分のデッキから、黄ホロメン1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → spOshiSkill（能動）。デッキ（非公開領域）内の黄ホロメンを1枚選んで公開し手札へ。
 *     その後デッキをシャッフルする。候補が無ければシャッフルのみ。
 *     ※コスト[ホロパワー：-2]・[ゲームに1回]制限はエンジンが処理するため run には書かない。
 *
 * 保留: なし（全効果実装済み）。
 */
export default {
  number: 'hBD24-050',

  oshiSkill: {
    name: 'イエローエンハンス',
    canUse(engine, ownerIdx) {
      // 自分の黄ホロメンがいる時のみ意味がある
      const p = engine.state.players[ownerIdx];
      for (const pos of engine._stagePositions(p)) {
        const h = engine._holomemAt(p, pos);
        const top = h && h.stack[0];
        if (top && top.color === '黄') return true;
      }
      return false;
    },
    *run(ctx) {
      // 自分の黄ホロメン1人を選ぶ
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.top && e.top.color === '黄',
        title: 'アーツ+20する黄ホロメンを選択',
      });
      if (!entry) return;
      const target = entry.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 20,
        ownerIdx: ctx.playerIdx,
        match: (h) => h === target,
        description: `このターンの間、${target.stack[0].name}（黄）のアーツ+20`,
      });
    },
  },

  spOshiSkill: {
    name: 'Birthday Gift ～Yellow～',
    canUse(engine, ownerIdx) {
      // デッキに黄ホロメンが1枚以上ある時のみ意味がある
      const p = engine.state.players[ownerIdx];
      return p.deck.some((c) => c.kind === 'holomen' && c.color === '黄');
    },
    *run(ctx) {
      const cand = ctx.deckCards((c) => c.kind === 'holomen' && c.color === '黄');
      if (cand.length === 0) {
        ctx.shuffleDeck();
        return;
      }
      const picked = yield ctx.chooseCard({
        cards: cand,
        title: '手札に加える黄ホロメンを選択',
      });
      // 「公開し、手札に加える」=必須。候補があるため通常 picked は非null
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
