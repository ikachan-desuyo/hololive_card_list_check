/**
 * 白銀ノエル (hBD24-012) 推しホロメン・白 / ライフ5
 *
 * 推しスキル「ホワイトエンハンス」[ホロパワー：-2][ターンに1回]:
 *   このターンの間、自分の白ホロメン1人のアーツ+20。
 *   → oshiSkill（能動）。自分のステージの白ホロメン1人を選び、
 *     その1人だけにターン限定の artsPlus+20 を付与する。
 *     対象は選んだ瞬間のホロメンに固定（match で同一オブジェクトを判定）。
 *     コスト[ホロパワー：-2]と[ターンに1回]制限はエンジンが処理するため run には書かない。
 *
 * SP推しスキル「Birthday Gift ～White～」[ホロパワー：-2][ゲームに1回]:
 *   自分のデッキから、白ホロメン1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → spOshiSkill（能動）。デッキ内の白ホロメン1枚を選んで公開し手札に加え、デッキをシャッフルする。
 *     コスト[ホロパワー：-2]と[ゲームに1回]制限はエンジンが処理するため run には書かない。
 *
 * 保留点: なし（両スキルとも実装済み）。
 * 修正（2026-07-17 監査）: 色判定を engine._hasColor / (color||'').includes に統一（多色ホロメン対応、総合ルール 2.4.3）。
 * 修正（2026-07-17 監査）: SPスキルのデッキサーチに「加えない」を追加（非公開領域は見つからなかったことにできる、総合ルール 4.1.2.3）。
 */
export default {
  number: 'hBD24-012',

  oshiSkill: {
    name: 'ホワイトエンハンス',
    canUse(engine, ownerIdx) {
      // 自分のステージに白ホロメンが1人でもいる時のみ意味がある
      const p = engine.state.players[ownerIdx];
      for (const pos of engine._stagePositions(p)) {
        const h = engine._holomemAt(p, pos);
        if (h && h.stack[0] && engine._hasColor(h, '白')) return true;
      }
      return false;
    },
    *run(ctx) {
      // 自分の白ホロメン1人を選ぶ
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.engine._hasColor(e.holomem, '白'),
        title: 'アーツ+20する白ホロメンを選択',
      });
      if (!entry) return;
      const target = entry.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 20,
        ownerIdx: ctx.playerIdx,
        // 選んだ1人だけを対象に固定
        match: (h) => h === target,
        description: `このターンの間、${entry.top.name} のアーツ+20`,
      });
    },
  },

  spOshiSkill: {
    name: 'Birthday Gift ～White～',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // デッキに白ホロメンが居ること
      return p.deck.some((c) => c.kind === 'holomen' && (c.color || '').includes('白'));
    },
    *run(ctx) {
      const cand = ctx.deckCards((c) => c.kind === 'holomen' && (c.color || '').includes('白'));
      if (cand.length === 0) {
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
        ctx.flashReveal(picked); // どのカードを公開したか画面に見せる
        ctx.addToHand(picked); // 公開ログ付きで手札に加える
      }
      // そしてデッキをシャッフルする
      ctx.shuffleDeck();
    },
  },
};
