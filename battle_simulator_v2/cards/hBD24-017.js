/**
 * 兎田ぺこら（推しホロメン hBD24-017・緑・ライフ5）
 *
 * 推しスキル「グリーンエンハンス」[ホロパワー：-2][ターンに1回]:
 *   このターンの間、自分の緑ホロメン1人のアーツ+20。
 *   → oshiSkill（メイン起動型・能動）。自分の緑ホロメン1人を選び、
 *      そのホロメン限定で「このターンの間アーツ+20」のターン修正(artsPlus)を付与する。
 *      match は選んだホロメン実体に一致（ブルーム/移動しても同じスタックを追う）。
 *      コスト[ホロパワー：-2]はエンジンが処理するため run には書かない。
 *
 * SP推しスキル「Birthday Gift ～Green～」[ホロパワー：-2][ゲームに1回]:
 *   自分のデッキから、緑ホロメン1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → spOshiSkill（能動）。デッキ（非公開領域）内の緑ホロメンを1枚選び公開して手札へ。
 *      その後デッキをシャッフルする。デッキ内容は非公開のため「加えない」も選べる(optional)。
 *      コスト[ホロパワー：-2]はエンジンが処理するため run には書かない。
 *
 * 保留: なし（両スキルとも既存プリミティブで実装可能）。
 * 修正（2026-07-17 監査）: 色判定を engine._hasColor / (color||'').includes に統一（多色ホロメン対応、総合ルール 2.4.3）。
 */
export default {
  number: 'hBD24-017',

  oshiSkill: {
    name: 'グリーンエンハンス',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // 自分の緑ホロメンが1人でもいれば使える
      return engine._stageHolomems(p).some((h) => engine._hasColor(h, '緑'));
    },
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.engine._hasColor(e.holomem, '緑'),
        title: 'このターン アーツ+20する緑ホロメンを選択',
      });
      if (!entry) return;
      const chosen = entry.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 20,
        ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターンの間、${chosen.stack[0].name}（緑）のアーツ+20`,
      });
    },
  },

  spOshiSkill: {
    name: 'Birthday Gift ～Green～',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // デッキに緑ホロメンが1枚以上ある時のみ使える
      return p.deck.some((c) => c && c.kind === 'holomen' && (c.color || '').includes('緑'));
    },
    *run(ctx) {
      const greens = ctx.deckCards((c) => c && c.kind === 'holomen' && (c.color || '').includes('緑'));
      const picked = yield ctx.chooseCard({
        cards: greens,
        title: '手札に加える緑ホロメンを選択',
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
