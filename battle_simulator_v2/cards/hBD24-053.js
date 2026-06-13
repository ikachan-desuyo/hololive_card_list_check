/**
 * 水宮枢（推しホロメン hBD24-053・青・ライフ5）
 *
 * 推しスキル「ブルーエンハンス」[ホロパワー：-2][ターンに1回]:
 *   このターンの間、自分の青ホロメン1人のアーツ+20。
 *   → oshiSkill（メイン起動型・能動）。青のホロメン1人を選び、このターンの間 artsPlus +20。
 *      コスト[ホロパワー：-2]はエンジンが処理するため run には書かない。
 *
 * SP推しスキル「Birthday Gift ～Blue～」[ホロパワー：-2][ゲームに1回]:
 *   自分のデッキから、青ホロメン1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → spOshiSkill（能動）。デッキ内の青ホロメンを1枚選び公開して手札へ。加えた後にデッキをシャッフル。
 *
 * 保留: なし（両スキルとも既存プリミティブで実装可能）。
 */
export default {
  number: 'hBD24-053',

  oshiSkill: {
    name: 'ブルーエンハンス',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // 自分の青ホロメンが1人でもいれば使える
      return engine._stageHolomems(p).some((h) => h.stack[0] && h.stack[0].color === '青');
    },
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.top.color === '青',
        title: 'このターン アーツ+20する青ホロメンを選択',
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
    name: 'Birthday Gift ～Blue～',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      return p.deck.some((c) => c.kind === 'holomen' && c.color === '青');
    },
    *run(ctx) {
      const blues = ctx.deckCards((c) => c.kind === 'holomen' && c.color === '青');
      if (blues.length === 0) {
        ctx.log(`${ctx.player.name}: デッキに青ホロメンが無い`);
        ctx.shuffleDeck();
        return;
      }
      const picked = yield ctx.chooseCard({
        cards: blues,
        title: '手札に加える青ホロメンを選択',
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked, { reveal: true });
      }
      ctx.shuffleDeck();
    },
  },
};
