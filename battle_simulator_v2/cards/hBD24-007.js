/**
 * ジジ・ムリン（推しホロメン hBD24-007）黄・ライフ5
 *
 * 推しスキル「イエローエンハンス」[ホロパワー：-2][ターンに1回]:
 *   このターンの間、自分の黄ホロメン1人のアーツ+20。
 *   → oshiSkill（能動）。自分の黄ホロメンを1人選び、このターンの間そのホロメンのアーツ+20。
 *      コスト[ホロパワー：-2]とターン1回制限はエンジンが処理するため run には書かない。
 *
 * SP推しスキル「Birthday Gift ～Yellow～」[ホロパワー：-2][ゲームに1回]:
 *   自分のデッキから、黄ホロメン1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → spOshiSkill（能動）。デッキ内の kind=holomen かつ color=黄 を1枚選び公開して手札へ。
 *      （「公開し」=reveal、加えた後にデッキをシャッフル）
 *
 * 保留: なし（両スキルとも既存プリミティブで実装済み）。
 */
export default {
  number: 'hBD24-007',

  oshiSkill: {
    name: 'イエローエンハンス',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // 自分の黄ホロメンが1人以上いる時のみ意味がある
      return engine._stageHolomems(p).some((h) => h.stack[0].color === '黄');
    },
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.top.color === '黄',
        title: 'アーツ+20する自分の黄ホロメンを選択',
      });
      if (!entry) return;
      const target = entry.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus', amount: 20, ownerIdx: ctx.playerIdx,
        match: (h) => h === target,
        description: `このターンの間、${target.stack[0].name}（黄）のアーツ+20`,
      });
    },
  },

  spOshiSkill: {
    name: 'Birthday Gift ～Yellow～',
    *run(ctx) {
      const yellows = ctx.deckCards((c) => c.kind === 'holomen' && c.color === '黄');
      if (yellows.length === 0) {
        ctx.log(`${ctx.player.name}: デッキに黄ホロメンが無い`);
        ctx.shuffleDeck();
        return;
      }
      const picked = yield ctx.chooseCard({
        cards: yellows,
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
