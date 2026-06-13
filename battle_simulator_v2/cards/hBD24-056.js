/**
 * 大空スバル（推しホロメン hBD24-056・黄）
 *
 * 推しスキル「イエローエンハンス」[ホロパワー：-2][ターンに1回]:
 *   このターンの間、自分の黄ホロメン1人のアーツ+20。
 *   → oshiSkill（能動）。黄ホロメンを1人選び artsPlus のターン修正を付与。
 *      自分の黄ホロメンがいなければ使えない。
 *
 * SP推しスキル「Birthday Gift ～Yellow～」[ホロパワー：-2][ゲームに1回]:
 *   自分のデッキから、黄ホロメン1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → spOshiSkill（能動）。デッキ内の黄ホロメンを1枚選び公開して手札へ。加えた後にシャッフル。
 *      （対象がいなくてもシャッフルは行う＝公開して加えられるカードが無い場合も処理を続行）
 *
 * 保留: なし（コスト[ホロパワー：-2]・ターン/ゲーム制限はエンジン側が処理するため run には書かない）
 */
export default {
  number: 'hBD24-056',
  oshiSkill: {
    name: 'イエローエンハンス',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      return engine._stageHolomems(p).some((h) => h.stack[0].color === '黄');
    },
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.top.color === '黄',
        title: 'このターン アーツ+20する黄ホロメンを選択',
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
    name: 'Birthday Gift ～Yellow～',
    *run(ctx) {
      const holomems = ctx.deckCards((c) => c.kind === 'holomen' && c.color === '黄');
      if (holomems.length === 0) {
        ctx.log(`${ctx.player.name}: デッキに黄ホロメンが無い`);
        ctx.shuffleDeck();
        return;
      }
      const picked = yield ctx.chooseCard({
        cards: holomems,
        title: '手札に加える黄ホロメンを選択',
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked, { reveal: true });
      }
      ctx.shuffleDeck();
    },
  },
};
