/**
 * 百鬼あやめ（推しホロメン hBD24-015）赤・ライフ5
 *
 * 推しスキル「レッドエンハンス」[ホロパワー：-2][ターンに1回]:
 *   このターンの間、自分の赤ホロメン1人のアーツ+20。
 *   → oshiSkill（能動）。自分の赤ホロメンを1人選び、このターンの間そのホロメンのアーツ+20。
 *      コスト[ホロパワー：-2]とターン1回制限はエンジンが処理するため run には書かない。
 *
 * SP推しスキル「Birthday Gift ～Red～」[ホロパワー：-2][ゲームに1回]:
 *   自分のデッキから、赤ホロメン1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → spOshiSkill（能動）。デッキ内の kind=holomen かつ color=赤 を1枚選び公開して手札へ。
 *      （「公開し」=reveal、加えた後にデッキをシャッフル）
 *
 * 保留: なし（両スキルとも既存プリミティブで実装済み）。
 * 修正（2026-07-17 監査）: 色判定を engine._hasColor / (color||'').includes に統一（多色ホロメン対応、総合ルール 2.4.3）。
 * 修正（2026-07-17 監査）: SPスキルのデッキサーチに「加えない」を追加（非公開領域は見つからなかったことにできる、総合ルール 4.1.2.3）。
 */
export default {
  number: 'hBD24-015',

  oshiSkill: {
    name: 'レッドエンハンス',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // 自分の赤ホロメンが1人以上いる時のみ意味がある
      return engine._stageHolomems(p).some((h) => engine._hasColor(h, '赤'));
    },
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.engine._hasColor(e.holomem, '赤'),
        title: 'アーツ+20する自分の赤ホロメンを選択',
      });
      if (!entry) return;
      const target = entry.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus', amount: 20, ownerIdx: ctx.playerIdx,
        match: (h) => h === target,
        description: `このターンの間、${target.stack[0].name}（赤）のアーツ+20`,
      });
    },
  },

  spOshiSkill: {
    name: 'Birthday Gift ～Red～',
    *run(ctx) {
      const reds = ctx.deckCards((c) => c.kind === 'holomen' && (c.color || '').includes('赤'));
      if (reds.length === 0) {
        ctx.log(`${ctx.player.name}: デッキに赤ホロメンが無い`);
        ctx.shuffleDeck();
        return;
      }
      const picked = yield ctx.chooseCard({
        cards: reds,
        title: '手札に加える赤ホロメンを選択',
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
