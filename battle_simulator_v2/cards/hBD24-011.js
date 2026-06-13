/**
 * ネリッサ・レイヴンクロフト（推しホロメン hBD24-011）・紫 / ライフ5
 *
 * 推しスキル「パープルエンハンス」[ホロパワー：-2][ターンに1回]:
 *   このターンの間、自分の紫ホロメン1人のアーツ+20。
 *   → oshiSkill（能動）。紫ホロメン1人を選び artsPlus のターン修正を付与。
 *      コスト[ホロパワー：-2]・[ターンに1回]はエンジン側が処理するため run には書かない。
 *
 * SP推しスキル「Birthday Gift ～Purple～」[ホロパワー：-2][ゲームに1回]:
 *   自分のデッキから、紫ホロメン1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → spOshiSkill（能動）。デッキ内の card_type=ホロメン・色=紫 を1枚選び公開して手札へ。
 *      （「公開し」=reveal、加えた後にデッキをシャッフル。該当が無くてもシャッフルは行う）
 *
 * 保留: なし
 */
export default {
  number: 'hBD24-011',
  oshiSkill: {
    name: 'パープルエンハンス',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // 自分の紫ホロメンが1人でもいれば使える
      return engine._stageHolomems(p).some((h) => h.stack[0].color === '紫');
    },
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.top.color === '紫',
        title: 'このターン アーツ+20する紫ホロメンを選択',
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
    name: 'Birthday Gift ～Purple～',
    *run(ctx) {
      const purples = ctx.deckCards((c) => c.kind === 'holomen' && c.color === '紫');
      if (purples.length === 0) {
        ctx.log(`${ctx.player.name}: デッキに紫ホロメンが無い`);
        ctx.shuffleDeck();
        return;
      }
      const picked = yield ctx.chooseCard({
        cards: purples,
        title: '手札に加える紫ホロメンを選択',
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked, { reveal: true });
      }
      ctx.shuffleDeck();
    },
  },
};
