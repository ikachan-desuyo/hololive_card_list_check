/**
 * 白上フブキ（推しホロメン hBD24-004・白・ライフ5）
 *
 * 推しスキル「ホワイトエンハンス」[ホロパワー：-2][ターンに1回]:
 *   このターンの間、自分の白ホロメン1人のアーツ+20。
 *   → oshiSkill（メイン起動型・能動）。白のホロメン1人を選び、このターンの間 artsPlus +20。
 *      コスト[ホロパワー：-2]はエンジンが処理するため run には書かない。
 *
 * SP推しスキル「Birthday Gift ～White～」[ホロパワー：-2][ゲームに1回]:
 *   自分のデッキから、白ホロメン1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → spOshiSkill（能動）。デッキ内の白ホロメンを1枚選び公開して手札へ。加えた後にデッキをシャッフル。
 *
 * 保留: なし（両スキルとも既存プリミティブで実装可能）。
 * 修正（2026-07-17 監査）: 色判定を engine._hasColor / (color||'').includes に統一（多色ホロメン対応、総合ルール 2.4.3）。
 * 修正（2026-07-17 監査）: SPスキルのデッキサーチに「加えない」を追加（非公開領域は見つからなかったことにできる、総合ルール 4.1.2.3）。
 */
export default {
  number: 'hBD24-004',

  oshiSkill: {
    name: 'ホワイトエンハンス',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // 自分の白ホロメンが1人でもいれば使える
      return engine._stageHolomems(p).some((h) => engine._hasColor(h, '白'));
    },
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.engine._hasColor(e.holomem, '白'),
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
      const whites = ctx.deckCards((c) => c.kind === 'holomen' && (c.color || '').includes('白'));
      if (whites.length === 0) {
        ctx.log(`${ctx.player.name}: デッキに白ホロメンが無い`);
        ctx.shuffleDeck();
        return;
      }
      const picked = yield ctx.chooseCard({
        cards: whites,
        title: '手札に加える白ホロメンを選択',
        optional: true,
        skipLabel: '加えない',
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked, { reveal: true });
      }
      ctx.shuffleDeck();
    },
  },
};
