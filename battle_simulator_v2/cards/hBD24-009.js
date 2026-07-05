/**
 * セシリア・イマーグリーン（推しホロメン hBD24-009）・緑 / ライフ5
 *
 * 推しスキル「グリーンエンハンス」[ホロパワー：-2][ターンに1回]:
 *   このターンの間、自分の緑ホロメン1人のアーツ+20。
 *   → oshiSkill（能動）。緑ホロメン1人を選び artsPlus のターン修正を付与。
 *      コスト[ホロパワー：-2]・[ターンに1回]はエンジン側が処理するため run には書かない。
 *
 * SP推しスキル「Birthday Gift ～Green～」[ホロパワー：-2][ゲームに1回]:
 *   自分のデッキから、緑ホロメン1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → spOshiSkill（能動）。デッキ内の card_type=ホロメン・色=緑 を1枚選び公開して手札へ。
 *      （「公開し」=reveal、加えた後にデッキをシャッフル。該当が無くてもシャッフルは行う）
 *
 * 保留: なし
 */
export default {
  number: 'hBD24-009',
  oshiSkill: {
    name: 'グリーンエンハンス',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // 自分の緑ホロメンが1人でもいれば使える
      return engine._stageHolomems(p).some((h) => h.stack[0].color === '緑');
    },
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.top.color === '緑',
        title: 'このターン アーツ+20する緑ホロメンを選択',
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
    name: 'Birthday Gift ～Green～',
    *run(ctx) {
      const greens = ctx.deckCards((c) => c.kind === 'holomen' && c.color === '緑');
      if (greens.length === 0) {
        ctx.log(`${ctx.player.name}: デッキに緑ホロメンが無い`);
        ctx.shuffleDeck();
        return;
      }
      const picked = yield ctx.chooseCard({
        cards: greens,
        title: '手札に加える緑ホロメンを選択',
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked, { reveal: true });
      }
      ctx.shuffleDeck();
    },
  },
};
