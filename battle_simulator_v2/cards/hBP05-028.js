/**
 * 獅白ぼたん (hBP05-028) 緑・Buzz・1st・HP250（#5期生）
 * アーツ「ここからが俺たちのスタートだ」(40):
 *   自分の〈獅白ぼたん〉のエール1枚をアーカイブできる：相手のセンターホロメンに特殊ダメージ30を与える。
 * キーワード「ちょっと頑張りました」:
 *   [センターポジション限定][ターンに1回]自分の推しホロメンの〈獅白ぼたん〉か自分のステージの
 *   〈獅白ぼたん〉が相手のホロメンに30以上の特殊ダメージを与えた時、自分のデッキを1枚引く。
 *   → triggers.onSpecialDamageDealt で実装。engine が dealSpecialDamage 時に自分のステージへ発火する。
 *     発生源が〈獅白ぼたん〉で30以上、このぼたんがセンターなら[ターンに1回]ドロー1。
 *     推しホロメンの〈獅白ぼたん〉発（推しスキル「狙撃」hBP03-002）も info.sourceOshiCard 経由で発火する（2026-07-17 監査対応）
 */
export default {
  number: 'hBP05-028',
  triggers: {
    *onSpecialDamageDealt(ctx) {
      const self = ctx.sourceHolomem; // 監視者（このぼたん）
      if (self?.stack[0].name !== '獅白ぼたん') return;
      if (ctx.engine._zoneOf(self) !== 'center') return; // [センター限定]
      const info = ctx.specialDealt;
      if (!info || info.amount < 30) return;              // 30以上の特殊ダメージ
      // 発生源が〈獅白ぼたん〉: ステージのホロメン、または推しホロメン（推しスキル「狙撃」hBP03-002 等）
      const fromBotan = info.source
        ? ctx.engine._nameIs(info.source.stack[0], '獅白ぼたん')
        : (info.sourceOshiCard ? ctx.engine._nameIs(info.sourceOshiCard, '獅白ぼたん') : false);
      if (!fromBotan) return;
      if (ctx.oncePerTurnUsed('hBP05-028:draw')) return;  // [ターンに1回]
      ctx.markOncePerTurn('hBP05-028:draw');
      ctx.draw(1);
    },
  },
  arts: {
    'ここからが俺たちのスタートだ': {
      *run(ctx) {
        // コスト: 〈獅白ぼたん〉のエール1枚をアーカイブ
        const pairs = [];
        for (const e of ctx.holomems('self', (x) => x.top.name === '獅白ぼたん')) {
          for (const ch of e.holomem.cheers) pairs.push({ ch, from: e.holomem });
        }
        if (pairs.length === 0) return;
        const ok = yield ctx.confirm('〈獅白ぼたん〉のエール1枚をアーカイブして特殊ダメージ30を与えますか？');
        if (!ok) return;
        const cheer = yield ctx.chooseCard({ cards: pairs.map((p) => p.ch), title: 'アーカイブするエールを選択' });
        if (!cheer) return;
        const from = pairs.find((p) => p.ch === cheer).from;
        yield* ctx.archiveCheer(from, cheer);
        const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
        if (center) yield* ctx.dealSpecialDamage(center, 30);
      },
    },
  },
};
