/**
 * 音乃瀬奏（推しホロメン hBD24-039・黄・ライフ5）
 *
 * 推しスキル「イエローエンハンス」[ホロパワー：-2][ターンに1回]:
 *   このターンの間、自分の黄ホロメン1人のアーツ+20。
 *   → oshiSkill（メイン起動型・能動）。黄のホロメン1人を選び、このターンの間 artsPlus +20。
 *      match は選んだホロメン実体に一致（ブルーム/移動しても同じスタックを追う）。
 *      コスト[ホロパワー：-2]はエンジンが処理するため run には書かない。
 *
 * SP推しスキル「Birthday Gift ～Yellow～」[ホロパワー：-2][ゲームに1回]:
 *   自分のデッキから、黄ホロメン1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → spOshiSkill（能動）。デッキ（非公開領域）内の黄ホロメンを1枚選んで公開し手札へ。
 *      その後デッキをシャッフルする。コスト[ホロパワー：-2]はエンジンが処理する。
 *
 * 保留: なし（両スキルとも既存プリミティブで実装可能）。
 * 修正（2026-07-17 監査）: SPスキルのデッキサーチに「加えない」を追加（非公開領域は見つからなかったことにできる、総合ルール 4.1.2.3）。
 */
export default {
  number: 'hBD24-039',

  oshiSkill: {
    name: 'イエローエンハンス',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // 自分の黄ホロメンが1人でもいれば使える
      return engine._stageHolomems(p).some((h) => h.stack[0] && (h.stack[0].color || '').includes('黄'));
    },
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => (e.top.color || '').includes('黄'),
        title: 'このターン アーツ+20する黄ホロメンを選択',
      });
      if (!entry) return;
      const chosen = entry.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus', amount: 20, ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターンの間、${chosen.stack[0].name}（黄）のアーツ+20`,
      });
    },
  },

  spOshiSkill: {
    name: 'Birthday Gift ～Yellow～',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      return p.deck.some((c) => c.kind === 'holomen' && (c.color || '').includes('黄'));
    },
    *run(ctx) {
      const yellows = ctx.deckCards((c) => c.kind === 'holomen' && (c.color || '').includes('黄'));
      if (yellows.length === 0) {
        ctx.log(`${ctx.player.name}: デッキに黄ホロメンが無い`);
        ctx.shuffleDeck();
        return;
      }
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
