/**
 * 雪花ラミィ（推しホロメン hBD24-010）・青 / ライフ5
 *
 * 推しスキル「ブルーエンハンス」[ホロパワー：-2][ターンに1回]:
 *   このターンの間、自分の青ホロメン1人のアーツ+20。
 *   → oshiSkill（能動）。青ホロメン1人を選び artsPlus のターン修正を付与。
 *      コスト[ホロパワー：-2]・[ターンに1回]はエンジン側が処理するため run には書かない。
 *
 * SP推しスキル「Birthday Gift ～Blue～」[ホロパワー：-2][ゲームに1回]:
 *   自分のデッキから、青ホロメン1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → spOshiSkill（能動）。デッキ内の card_type=ホロメン・色=青 を1枚選び公開して手札へ。
 *      （「公開し」=reveal、加えた後にデッキをシャッフル。該当が無くてもシャッフルは行う）
 *
 * 保留: なし
 * 修正（2026-07-17 監査）: 色判定を engine._hasColor / (color||'').includes に統一（多色ホロメン対応、総合ルール 2.4.3）。
 * 修正（2026-07-17 監査）: SPスキルのデッキサーチに「加えない」を追加（非公開領域は見つからなかったことにできる、総合ルール 4.1.2.3）。
 */
export default {
  number: 'hBD24-010',
  oshiSkill: {
    name: 'ブルーエンハンス',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // 自分の青ホロメンが1人でもいれば使える
      return engine._stageHolomems(p).some((h) => engine._hasColor(h, '青'));
    },
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.engine._hasColor(e.holomem, '青'),
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
    *run(ctx) {
      const blues = ctx.deckCards((c) => c.kind === 'holomen' && (c.color || '').includes('青'));
      if (blues.length === 0) {
        ctx.log(`${ctx.player.name}: デッキに青ホロメンが無い`);
        ctx.shuffleDeck();
        return;
      }
      const picked = yield ctx.chooseCard({
        cards: blues,
        title: '手札に加える青ホロメンを選択',
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
