/**
 * 森カリオペ (hBD24-037) 推しホロメン・紫
 *
 * 推しスキル「パープルエンハンス」[ホロパワー：-2][ターンに1回]:
 *   このターンの間、自分の紫ホロメン1人のアーツ+20。
 *   → oshiSkill（能動）。自分の紫ホロメン（トップカードの色が紫）を1人選び、
 *     そのホロメン限定で「このターンの間アーツ+20」のターン修正を付与する。
 *     match は選んだホロメン実体に一致させる（ブルーム/移動しても同じスタックを追う）。
 *     ※コスト[ホロパワー：-2]・[ターンに1回]制限はエンジンが処理するため run には書かない。
 *
 * SP推しスキル「Birthday Gift ～Purple～」[ホロパワー：-2][ゲームに1回]:
 *   自分のデッキから、紫ホロメン1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → spOshiSkill（能動）。デッキ（非公開領域）内の紫ホロメンを1枚選んで公開し手札へ。
 *     その後デッキをシャッフルする。候補が無ければシャッフルのみ。
 *     ※コスト[ホロパワー：-2]・[ゲームに1回]制限はエンジンが処理するため run には書かない。
 *
 * 保留: なし（全効果実装済み）。
 * 修正（2026-07-17 監査）: SPスキルのデッキサーチに「加えない」を追加（非公開領域は見つからなかったことにできる、総合ルール 4.1.2.3）。
 */
export default {
  number: 'hBD24-037',

  oshiSkill: {
    name: 'パープルエンハンス',
    canUse(engine, ownerIdx) {
      // 自分の紫ホロメンがいる時のみ意味がある
      const p = engine.state.players[ownerIdx];
      for (const pos of engine._stagePositions(p)) {
        const h = engine._holomemAt(p, pos);
        const top = h && h.stack[0];
        if (top && (top.color || '').includes('紫')) return true;
      }
      return false;
    },
    *run(ctx) {
      // 自分の紫ホロメン1人を選ぶ
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.top && (e.top.color || '').includes('紫'),
        title: 'アーツ+20する紫ホロメンを選択',
      });
      if (!entry) return;
      const target = entry.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 20,
        ownerIdx: ctx.playerIdx,
        match: (h) => h === target,
        description: `このターンの間、${target.stack[0].name}（紫）のアーツ+20`,
      });
    },
  },

  spOshiSkill: {
    name: 'Birthday Gift ～Purple～',
    canUse(engine, ownerIdx) {
      // デッキに紫ホロメンが1枚以上ある時のみ意味がある
      const p = engine.state.players[ownerIdx];
      return p.deck.some((c) => c.kind === 'holomen' && (c.color || '').includes('紫'));
    },
    *run(ctx) {
      const cand = ctx.deckCards((c) => c.kind === 'holomen' && (c.color || '').includes('紫'));
      if (cand.length === 0) {
        ctx.shuffleDeck();
        return;
      }
      const picked = yield ctx.chooseCard({
        cards: cand,
        title: '手札に加える紫ホロメンを選択',
        optional: true,
        skipLabel: '加えない',
      });
      // 非公開領域のサーチのため「加えない」も選べる（総合ルール 4.1.2.3）。選ばなければシャッフルのみ
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.flashReveal(picked);
        ctx.addToHand(picked);
      }
      // そしてデッキをシャッフルする
      ctx.shuffleDeck();
    },
  },
};
