/**
 * 不知火フレア（推しホロメン hBD24-036・黄・ライフ5）
 *
 * 推しスキル「イエローエンハンス」[ホロパワー：-2][ターンに1回]:
 *   このターンの間、自分の黄ホロメン1人のアーツ+20。
 *   → oshiSkill（メイン起動型・能動）。自分の黄ホロメン1人を選び、
 *      そのホロメン限定で「このターンの間アーツ+20」のターン修正(artsPlus)を付与する。
 *      match は選んだホロメン実体に一致（ブルーム/移動しても同じスタックを追う）。
 *      コスト[ホロパワー：-2]はエンジンが処理するため run には書かない。
 *
 * SP推しスキル「Birthday Gift ～Yellow～」[ホロパワー：-2][ゲームに1回]:
 *   自分のデッキから、黄ホロメン1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → spOshiSkill（能動）。デッキ（非公開領域）内の黄ホロメンを1枚選び公開して手札へ。
 *      その後デッキをシャッフルする。デッキ内容は非公開のため「加えない」も選べる(optional)。
 *      コスト[ホロパワー：-2]はエンジンが処理するため run には書かない。
 *
 * 保留: なし（両スキルとも既存プリミティブで実装可能）。
 */
export default {
  number: 'hBD24-036',

  oshiSkill: {
    name: 'イエローエンハンス',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // 自分の黄ホロメンが1人でもいれば使える
      return engine._stageHolomems(p).some((h) => h.stack[0] && h.stack[0].color === '黄');
    },
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.top && e.top.color === '黄',
        title: 'このターン アーツ+20する黄ホロメンを選択',
      });
      if (!entry) return;
      const chosen = entry.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 20,
        ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターンの間、${chosen.stack[0].name}（黄）のアーツ+20`,
      });
    },
  },

  spOshiSkill: {
    name: 'Birthday Gift ～Yellow～',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // デッキに黄ホロメンが1枚以上ある時のみ使える
      return p.deck.some((c) => c && c.kind === 'holomen' && c.color === '黄');
    },
    *run(ctx) {
      const yellows = ctx.deckCards((c) => c && c.kind === 'holomen' && c.color === '黄');
      const picked = yield ctx.chooseCard({
        cards: yellows,
        title: '手札に加える黄ホロメンを選択',
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
