/**
 * 風真いろは 2nd (hBP07-030) 緑・2nd・HP210
 * ブルームエフェクト「holoRêve -いろは-」:
 *   BuzzホロメンからBloomした時、自分のホロメン1人のHP100回復。
 *   → sourceHolomem.stack[1]（Bloom元）がBuzzホロメンかを判定して発火。
 * アーツ「たくさんの宝物」(100):
 *   このホロメンのエール2枚をアーカイブできる：自分のデッキを2枚引く。
 */
export default {
  number: 'hBP07-030',
  bloomEffect: {
    name: 'holoRêve -いろは-',
    *run(ctx) {
      // 「BuzzホロメンからBloomした時」: Bloom元（stack[1]）がBuzzホロメンの場合のみ
      const from = ctx.sourceHolomem?.stack?.[1];
      if (!from || !from.buzz) {
        ctx.log('BuzzホロメンからのBloomではないため発動しない');
        return;
      }
      const target = yield ctx.chooseHolomem({
        side: 'self',
        title: 'HP100回復する自分のホロメンを選択',
      });
      if (target) ctx.heal(target.holomem, 100);
    },
  },
  arts: {
    'たくさんの宝物': {
      *run(ctx) {
        if (ctx.sourceHolomem.cheers.length < 2) return; // コスト（エール2枚）を払えない
        const ok = yield ctx.confirm('このホロメンのエール2枚をアーカイブしてデッキを2枚引きますか？');
        if (!ok) return;
        const picked = yield ctx.chooseCards({
          cards: [...ctx.sourceHolomem.cheers],
          count: 2,
          title: 'コスト: アーカイブするエールを選択（2枚）',
        });
        if (picked.length < 2) return;
        for (const cheer of picked) {
          yield* ctx.archiveCheer(ctx.sourceHolomem, cheer);
        }
        ctx.draw(2);
      },
    },
  },
};
