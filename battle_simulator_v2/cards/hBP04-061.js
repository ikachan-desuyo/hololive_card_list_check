/**
 * クレイジー・オリー 2nd (hBP04-061) 紫・ホロメン・HP200（#ID #ID2期生 #語学）
 *
 * ブルームエフェクト「オリーを見てください！」:
 *   自分のSP推しスキル「蘇るオリー」(hBP02-006) でBloomした時、
 *   自分の〈クレイジー・オリー〉1人のHPすべて回復。
 *
 * アーツ「HOLOROの魂」(80+):
 *   自分のステージのこのホロメン以外の#ID2期生を持つ2ndホロメン1人につき、このアーツ+20。
 *   （特攻: 緑+50）
 *
 * 保留:
 *   - ブルームエフェクトの発動条件「SP推しスキル「蘇るオリー」でBloomした時」を厳密に判定できない。
 *     エンジンはBloom時に常に bloomEffect.run を呼ぶ（通常Bloom／推しスキル「ゾンビ戦術」／
 *     SP推しスキル「蘇るオリー」を区別する情報が ctx に無い）。誤発動を避けるため、
 *     ここでは安全側として bloomEffect の回復処理を発動しない（no-op）。
 *     ※発動経路を識別する仕組み（Bloom元スキルのマーカー等）を context/engine に追加できれば実装可能。
 */
export default {
  number: 'hBP04-061',

  // ブルームエフェクト本体（回復処理）は実装済みだが、発動条件（SP推しスキル経由か）を
  // 判定できないため安全側で発動しない。条件判定の手段ができ次第、下記 run を有効化する。
  // bloomEffect: {
  //   name: 'オリーを見てください！',
  //   *run(ctx) {
  //     const target = yield ctx.chooseHolomem({
  //       side: 'self',
  //       filter: (e) => e.top.name === 'クレイジー・オリー',
  //       title: 'HPをすべて回復する〈クレイジー・オリー〉を選択',
  //     });
  //     if (target) ctx.healAll(target.holomem);
  //   },
  // },

  arts: {
    'HOLOROの魂': {
      // このホロメン以外の #ID2期生 を持つ 2nd ホロメン1人につき +20
      dmgBonus(ctx) {
        const count = ctx.holomems('self', ({ holomem, top }) =>
          holomem !== ctx.sourceHolomem &&
          top.bloomLevel === '2nd' &&
          ctx.hasTag(top, 'ID2期生')).length;
        return count * 20;
      },
    },
  },
};
