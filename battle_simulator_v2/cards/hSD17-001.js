/**
 * 星街すいせい (hSD17-001) 推しホロメン・青
 *
 * 推しスキル「張り切ってがんばろーー!!!」[ホロパワー：-3][ターンに1回]:
 *   自分のエールデッキの上から1枚を自分のホロメンに送る。
 *   → oshiSkill（能動）。送り先（自分のホロメン）を1人選び、エールデッキ上から1枚を送る。
 *     タグ・名前の制限なし。
 *     ※コスト[ホロパワー：-3]と[ターンに1回]はエンジン側が処理するため run には書かない。
 *
 * SP推しスキル「流れ星」[ホロパワー：-2][ゲームに1回]:
 *   自分のセンターホロメンが〈星街すいせい〉なら、相手のバックホロメン1人に特殊ダメージ50を与える。
 *   → spOshiSkill（能動）。自分のセンターのトップカードが〈星街すいせい〉（名前一致）である場合のみ使える。
 *     相手のバックホロメン1人を選び、特殊ダメージ50を与える。
 *     ※コスト[ホロパワー：-2]と[ゲームに1回]はエンジン側が処理するため run には書かない。
 *     ※「ライフが減らない」等の記載は無いので noLifeOnDown は付けない。
 *
 * 保留: なし（全効果実装済み）。
 */

// 自分のセンターホロメンのトップカードが〈星街すいせい〉か
function centerIsSuisei(engine, ownerIdx) {
  const p = engine.state.players[ownerIdx];
  const c = p.center;
  return !!(c && c.stack[0] && c.stack[0].name === '星街すいせい');
}

export default {
  number: 'hSD17-001',

  oshiSkill: {
    name: '張り切ってがんばろーー!!!',
    canUse(engine, ownerIdx) {
      // 送り先（自分のステージのホロメン）とエールデッキの残りが必要
      const p = engine.state.players[ownerIdx];
      return engine._stageHolomems(p).length > 0 && p.cheerDeck.length > 0;
    },
    *run(ctx) {
      if (ctx.player.cheerDeck.length === 0) return;
      const dest = yield ctx.chooseHolomem({
        side: 'self',
        title: 'エールデッキの上から1枚を送るホロメンを選択',
      });
      if (!dest) return;
      ctx.sendCheerFromCheerDeckTop(dest.holomem);
    },
  },

  spOshiSkill: {
    name: '流れ星',
    canUse(engine, ownerIdx) {
      // 自分のセンターが〈星街すいせい〉で、相手のバックホロメンがいる時のみ使える
      if (!centerIsSuisei(engine, ownerIdx)) return false;
      const opp = engine.state.players[1 - ownerIdx];
      for (const pos of engine._stagePositions(opp)) {
        if (pos.zone === 'back') return true;
      }
      return false;
    },
    *run(ctx) {
      // 念のため発動時にもセンター条件を再確認
      if (!centerIsSuisei(ctx.engine, ctx.playerIdx)) return;
      const target = yield ctx.chooseHolomem({
        side: 'opp',
        filter: ({ pos }) => pos.zone === 'back',
        title: '特殊ダメージ50を与える相手のバックホロメンを選択',
      });
      if (!target) return;
      yield* ctx.dealSpecialDamage(target, 50);
    },
  },
};
