/**
 * こぼ・かなえる (hBD24-014) 推しホロメン・青
 *
 * 推しスキル「ブルーエンハンス」[ホロパワー：-2][ターンに1回]:
 *   このターンの間、自分の青ホロメン1人のアーツ+20。
 *   → oshiSkill（能動）。自分の青ホロメン1人を選び、artsPlus +20 のターン修正を付与。
 *     コスト[ホロパワー：-2]と[ターンに1回]制限はエンジンが処理するため run には書かない。
 *
 * SP推しスキル「Birthday Gift ～Blue～」[ホロパワー：-2][ゲームに1回]:
 *   自分のデッキから、青ホロメン1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → spOshiSkill（能動）。デッキ内の青ホロメン1枚を選んで公開し手札へ。最後にシャッフル。
 *     デッキはサーチ＝非公開領域なので「見つからない／選ばない」も保証（候補が無ければ何もしない）。
 *     コスト[ホロパワー：-2]はエンジンが処理するため run には書かない。
 *
 * 保留: なし
 * 修正（2026-07-17 監査）: 色判定を engine._hasColor / (color||'').includes に統一（多色ホロメン対応、総合ルール 2.4.3）。
 * 修正（2026-07-17 監査）: SPスキルのデッキサーチに「加えない」を追加（非公開領域は見つからなかったことにできる、総合ルール 4.1.2.3）。
 */
const isBlueHolomem = (card) => card && card.kind === 'holomen' && (card.color || '').includes('青');

export default {
  number: 'hBD24-014',

  oshiSkill: {
    name: 'ブルーエンハンス',
    canUse(engine, ownerIdx) {
      // 自分の青ホロメンが1人でもいれば使える
      const p = engine.state.players[ownerIdx];
      return engine._stageHolomems(p).some((h) => engine._hasColor(h, '青'));
    },
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.engine._hasColor(e.holomem, '青'),
        title: 'このターン アーツ+20する青ホロメン1人を選択',
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
      // デッキに青ホロメンが1枚以上あれば使える
      const p = engine.state.players[ownerIdx];
      return p.deck.some(isBlueHolomem);
    },
    *run(ctx) {
      const candidates = ctx.deckCards(isBlueHolomem);
      if (candidates.length === 0) {
        ctx.log(`${ctx.player.name}: デッキに青ホロメンが無い`);
        ctx.shuffleDeck();
        return;
      }
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: 'デッキから手札に加える青ホロメン1枚を選択',
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
