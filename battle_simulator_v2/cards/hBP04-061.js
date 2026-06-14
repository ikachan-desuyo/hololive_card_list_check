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
 * 発動条件「SP推しスキル「蘇るオリー」でBloomした時」:
 *   hBP02-006 の SP推しスキル「蘇るオリー」がアーカイブからBloomさせる際、bloomFromArchiveFlow に
 *   bloomSourceSkill:'SP推しスキル:蘇るオリー' を渡す。本ブルームエフェクトは ctx.bloomSourceSkill が
 *   その値の時だけ発動する（通常Bloom／推しスキル「ゾンビ戦術」経由では発動しない＝厳密解釈）。
 */
export default {
  number: 'hBP04-061',

  // ブルームエフェクト「オリーを見てください！」: SP推しスキル「蘇るオリー」経由のBloム時のみ、
  // 自分の〈クレイジー・オリー〉1人のHPをすべて回復する。
  bloomEffect: {
    name: 'オリーを見てください！',
    *run(ctx) {
      // 発動経路の判定: SP推しスキル「蘇るオリー」によるBloム時のみ
      if (ctx.bloomSourceSkill !== 'SP推しスキル:蘇るオリー') return;
      const targets = ctx.holomems('self', (e) => e.top.name === 'クレイジー・オリー');
      if (targets.length === 0) return;
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.top.name === 'クレイジー・オリー',
        title: 'HPをすべて回復する〈クレイジー・オリー〉を選択',
      });
      if (target) ctx.healAll(target.holomem);
    },
  },

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
