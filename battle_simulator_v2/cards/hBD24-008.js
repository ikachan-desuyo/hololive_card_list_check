/**
 * ベスティア・ゼータ (hBD24-008) 推しホロメン・白
 *
 * 推しスキル「ホワイトエンハンス」[ホロパワー：-2][ターンに1回]:
 *   このターンの間、自分の白ホロメン1人のアーツ+20。
 *   → oshiSkill（能動）。自分の白ホロメン1人を選び、このターンの間アーツ+20を付与する。
 *     コスト[ホロパワー：-2]と[ターンに1回]制限はエンジンが処理するため run には書かない。
 *
 * SP推しスキル「Birthday Gift ～White～」[ホロパワー：-2][ゲームに1回]:
 *   自分のデッキから、白ホロメン1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → spOshiSkill（能動）。デッキ内の白ホロメンを1枚選び、公開して手札に加え、デッキをシャッフルする。
 *     コスト[ホロパワー：-2]と[ゲームに1回]制限はエンジンが処理するため run には書かない。
 *     ※「白ホロメン」=色が白のホロメンカード。デッキ内に該当が無ければ何も加えずシャッフルのみ。
 * 修正（2026-07-17 監査）: 色判定を engine._hasColor / (color||'').includes に統一（多色ホロメン対応、総合ルール 2.4.3）。
 * 修正（2026-07-17 監査）: SPスキルのデッキサーチに「加えない」を追加（非公開領域は見つからなかったことにできる、総合ルール 4.1.2.3）。
 */
export default {
  number: 'hBD24-008',

  oshiSkill: {
    name: 'ホワイトエンハンス',
    canUse(engine, ownerIdx) {
      // 自分の白ホロメンが1人以上いる時のみ意味がある
      const p = engine.state.players[ownerIdx];
      return engine._stageHolomems(p).some((h) => engine._hasColor(h, '白'));
    },
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.engine._hasColor(e.holomem, '白'),
        title: 'アーツ+20する自分の白ホロメンを選択',
      });
      if (!entry) return;
      const target = entry.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus', amount: 20, ownerIdx: ctx.playerIdx,
        match: (h) => h === target,
        description: `このターンの間、${target.stack[0].name}（白）のアーツ+20`,
      });
    },
  },

  spOshiSkill: {
    name: 'Birthday Gift ～White～',
    canUse(engine, ownerIdx) {
      // デッキ内に白ホロメンがいる時のみ意味がある
      const p = engine.state.players[ownerIdx];
      return p.deck.some((c) => c.kind === 'holomen' && (c.color || '').includes('白'));
    },
    *run(ctx) {
      const cand = ctx.deckCards((c) => c.kind === 'holomen' && (c.color || '').includes('白'));
      if (cand.length === 0) {
        ctx.log(`${ctx.player.name}: デッキに白ホロメンが無い`);
        ctx.shuffleDeck();
        return;
      }
      const picked = yield ctx.chooseCard({
        cards: cand,
        title: '手札に加える白ホロメンを選択',
        optional: true,
        skipLabel: '加えない',
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.flashReveal(picked);
        ctx.addToHand(picked, { reveal: true });
      }
      // そしてデッキをシャッフルする
      ctx.shuffleDeck();
    },
  },
};
