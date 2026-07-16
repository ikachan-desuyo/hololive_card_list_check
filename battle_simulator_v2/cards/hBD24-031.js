/**
 * オーロ・クロニー (hBD24-031) 推しホロメン・青
 *
 * 推しスキル「ブルーエンハンス」[ホロパワー：-2][ターンに1回]:
 *   このターンの間、自分の青ホロメン1人のアーツ+20。
 *   → oshiSkill（能動）。自分の青ホロメン（トップカードの色が青）を1人選び、
 *     そのホロメン限定で「このターンの間アーツ+20」のターン修正を付与する。
 *     match は選んだホロメン実体に一致（ブルーム/移動しても同じスタックを追う）。
 *     ※コスト[ホロパワー：-2]はエンジン側が処理するため run には書かない。
 *
 * SP推しスキル「Birthday Gift ～Blue～」[ホロパワー：-2][ゲームに1回]:
 *   自分のデッキから、青ホロメン1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → spOshiSkill（能動）。デッキ（非公開領域）内の青ホロメンを1枚選んで公開し手札へ。
 *     その後デッキをシャッフルする。デッキ内容は非公開のため「加えない」も選べる(optional)。
 *     ※コスト[ホロパワー：-2]はエンジン側が処理するため run には書かない。
 *
 * 保留: なし（全効果実装済み）。
 * 修正（2026-07-17 監査）: 色判定を engine._hasColor / (color||'').includes に統一（多色ホロメン対応、総合ルール 2.4.3）。
 */
export default {
  number: 'hBD24-031',

  oshiSkill: {
    name: 'ブルーエンハンス',
    canUse(engine, ownerIdx) {
      // 青ホロメンが1人以上いる時のみ意味がある
      const p = engine.state.players[ownerIdx];
      return engine._stageHolomems(p).some((h) => engine._hasColor(h, '青'));
    },
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.engine._hasColor(e.holomem, '青'),
        title: 'アーツ+20する青ホロメンを選択',
      });
      if (!entry) return;
      const target = entry.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 20,
        ownerIdx: ctx.playerIdx,
        match: (h) => h === target,
        description: `このターンの間、${target.stack[0].name}（青）のアーツ+20`,
      });
    },
  },

  spOshiSkill: {
    name: 'Birthday Gift ～Blue～',
    canUse(engine, ownerIdx) {
      // デッキに青ホロメンが1枚以上ある時のみ使える
      const p = engine.state.players[ownerIdx];
      return p.deck.some((c) => c && c.kind === 'holomen' && (c.color || '').includes('青'));
    },
    *run(ctx) {
      const blues = ctx.deckCards((c) => c && c.kind === 'holomen' && (c.color || '').includes('青'));
      const picked = yield ctx.chooseCard({
        cards: blues,
        title: '手札に加える青ホロメンを選択',
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
