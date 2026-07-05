/**
 * 赤井はあと (hBD24-063) 推しホロメン・赤
 *
 * 推しスキル「レッドエンハンス」[ホロパワー：-2][ターンに1回]:
 *   このターンの間、自分の赤ホロメン1人のアーツ+20。
 *   → oshiSkill（能動）。自分の赤ホロメン（トップカードの色が赤）を1人選び、
 *     そのホロメン限定で「このターンの間アーツ+20」のターン修正を付与する。
 *     match は選んだホロメン実体に一致（ブルーム/移動しても同じスタックを追う）。
 *     ※コスト[ホロパワー：-2]はエンジン側が処理するため run には書かない。
 *
 * SP推しスキル「Birthday Gift ～Red～」[ホロパワー：-2][ゲームに1回]:
 *   自分のデッキから、赤ホロメン1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → spOshiSkill（能動）。デッキ（非公開領域）内の赤ホロメンを1枚選んで公開し手札へ。
 *     その後デッキをシャッフルする。デッキ内容は非公開のため「加えない」も選べる(optional)。
 *     ※コスト[ホロパワー：-2]はエンジン側が処理するため run には書かない。
 *
 * 保留: なし（全効果実装済み）。
 */
export default {
  number: 'hBD24-063',

  oshiSkill: {
    name: 'レッドエンハンス',
    canUse(engine, ownerIdx) {
      // 赤ホロメンが1人以上いる時のみ意味がある
      const p = engine.state.players[ownerIdx];
      return engine._stageHolomems(p).some((h) => h.stack[0] && h.stack[0].color === '赤');
    },
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.top && e.top.color === '赤',
        title: 'アーツ+20する赤ホロメンを選択',
      });
      if (!entry) return;
      const target = entry.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 20,
        ownerIdx: ctx.playerIdx,
        match: (h) => h === target,
        description: `このターンの間、${target.stack[0].name}（赤）のアーツ+20`,
      });
    },
  },

  spOshiSkill: {
    name: 'Birthday Gift ～Red～',
    canUse(engine, ownerIdx) {
      // デッキに赤ホロメンが1枚以上ある時のみ使える
      const p = engine.state.players[ownerIdx];
      return p.deck.some((c) => c && c.kind === 'holomen' && c.color === '赤');
    },
    *run(ctx) {
      const reds = ctx.deckCards((c) => c && c.kind === 'holomen' && c.color === '赤');
      const picked = yield ctx.chooseCard({
        cards: reds,
        title: '手札に加える赤ホロメンを選択',
        optional: true,
        skipLabel: '加えない',
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked, { reveal: true });
      }
      // そしてデッキをシャッフルする
      ctx.shuffleDeck();
    },
  },
};
