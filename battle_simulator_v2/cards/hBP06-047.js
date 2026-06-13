/**
 * 一条莉々華 (hBP06-047) 赤・2nd・HP190（#DEV_IS #ReGLOSS #料理 #語学）
 * コラボエフェクト「家にあるもの限界飯」:
 *   自分の推しホロメンが〈一条莉々華〉で、自分のアーカイブに〈限界飯〉が2枚以上あるなら、
 *   自分のデッキを2枚引く。
 * アーツ「ガチでなんもない。タスケテ。」(70):
 *   [コラボポジション限定]相手のコラボホロメンに特殊ダメージ50を与える。
 *   相手のコラボホロメンがいないなら、かわりに、相手のセンターホロメンに特殊ダメージ50を与える。
 */
export default {
  number: 'hBP06-047',
  collabEffect: {
    name: '家にあるもの限界飯',
    *run(ctx) {
      const oshi = ctx.player.oshi;
      if (!oshi || oshi.name !== '一条莉々華') return;
      const genkaiMeshi = ctx.player.archive.filter((c) => c.name === '限界飯').length;
      if (genkaiMeshi < 2) return;
      ctx.draw(2);
    },
  },
  arts: {
    'ガチでなんもない。タスケテ。': {
      *run(ctx) {
        // [コラボポジション限定] このホロメンがコラボにいる時のみ効果を発動する。
        if (ctx.sourceHolomemPos()?.zone !== 'collab') return;
        const collab = ctx.holomems('opp', (e) => e.pos.zone === 'collab')[0];
        if (collab) {
          yield* ctx.dealSpecialDamage(collab, 50);
          return;
        }
        const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
        if (center) yield* ctx.dealSpecialDamage(center, 50);
      },
    },
  },
};
