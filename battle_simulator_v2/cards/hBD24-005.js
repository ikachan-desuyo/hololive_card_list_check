/**
 * 姫森ルーナ（推しホロメン hBD24-005）・白 / ライフ5
 *
 * 推しスキル「ホワイトエンハンス」[ホロパワー：-2][ターンに1回]:
 *   このターンの間、自分の白ホロメン1人のアーツ+20。
 *   → oshiSkill（能動）。白ホロメン1人を選び artsPlus のターン修正を付与。
 *      コスト[ホロパワー：-2]・[ターンに1回]はエンジン側が処理するため run には書かない。
 *
 * SP推しスキル「Birthday Gift ～White～」[ホロパワー：-2][ゲームに1回]:
 *   自分のデッキから、白ホロメン1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → spOshiSkill（能動）。デッキ内の card_type=ホロメン・色=白 を1枚選び公開して手札へ。
 *      （「公開し」=reveal、加えた後にデッキをシャッフル。該当が無くてもシャッフルは行う）
 *
 * 保留: なし
 */
export default {
  number: 'hBD24-005',
  oshiSkill: {
    name: 'ホワイトエンハンス',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // 自分の白ホロメンが1人でもいれば使える
      return engine._stageHolomems(p).some((h) => h.stack[0].color === '白');
    },
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.top.color === '白',
        title: 'このターン アーツ+20する白ホロメンを選択',
      });
      if (!entry) return;
      const chosen = entry.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus', amount: 20, ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターンの間、${chosen.stack[0].name} のアーツ+20`,
      });
    },
  },
  spOshiSkill: {
    name: 'Birthday Gift ～White～',
    *run(ctx) {
      const whites = ctx.deckCards((c) => c.kind === 'holomen' && c.color === '白');
      if (whites.length === 0) {
        ctx.log(`${ctx.player.name}: デッキに白ホロメンが無い`);
        ctx.shuffleDeck();
        return;
      }
      const picked = yield ctx.chooseCard({
        cards: whites,
        title: '手札に加える白ホロメンを選択',
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked, { reveal: true });
      }
      ctx.shuffleDeck();
    },
  },
};
