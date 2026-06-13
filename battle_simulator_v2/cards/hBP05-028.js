/**
 * 獅白ぼたん (hBP05-028) 緑・Buzz・1st・HP250（#5期生）
 * アーツ「ここからが俺たちのスタートだ」(40):
 *   自分の〈獅白ぼたん〉のエール1枚をアーカイブできる：相手のセンターホロメンに特殊ダメージ30を与える。
 * ※キーワード「ちょっと頑張りました」（30以上の特殊ダメージを与えた時1ドロー）は
 *   「特殊ダメージ量トリガー」未対応のため未実装（CARD_EFFECT_STATUS.md §8）。
 */
export default {
  number: 'hBP05-028',
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
        ctx.archiveCheer(from, cheer);
        const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
        if (center) yield* ctx.dealSpecialDamage(center, 30);
      },
    },
  },
};
