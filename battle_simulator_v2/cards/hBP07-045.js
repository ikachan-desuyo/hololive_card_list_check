/**
 * ハコス・ベールズ (hBP07-045) 赤・1st・HP230 Buzzホロメン（#EN #Promise #ケモミミ）
 *
 * アーツ「キミがいないと楽しくないもん」(20+):
 *   自分の手札1枚につき、このアーツ+20。
 *   → dmgBonus（手札枚数 × 20）
 *
 * ギフト「テンション上がってきた！」:
 *   [センター・コラボ限定]自分のSP推しスキルを使った時、自分のデッキの上から1枚をホロパワーにする。
 *   → triggers.onOshiSkillUsed で実装。使ったのがSP推しスキル(ctx.oshiSkillInfo.sp)で、
 *     このホロメンがセンター/コラボにいるなら、デッキの上から1枚をホロパワー領域へ移す。
 */
export default {
  number: 'hBP07-045',
  arts: {
    'キミがいないと楽しくないもん': {
      dmgBonus(ctx) {
        // 自分の手札1枚につき+20（アーツ宣言時点の手札枚数）
        const handCount = ctx.player?.hand?.length || 0;
        return handCount * 20;
      },
    },
  },
  triggers: {
    // ギフト「テンション上がってきた！」: [センター・コラボ限定]自分のSP推しスキルを使った時、デッキの上から1枚をホロパワーにする
    *onOshiSkillUsed(ctx) {
      const info = ctx.oshiSkillInfo;
      if (!info || !info.sp) return;                          // SP推しスキルを使った時
      const z = ctx.sourceHolomemPos()?.zone;
      if (z !== 'center' && z !== 'collab') return;           // [センター・コラボポジション限定]
      if (ctx.player.deck.length === 0) return;
      const card = ctx.player.deck.shift();
      ctx.player.holoPower.push(card);
      ctx.log(`ハコス・ベールズ「テンション上がってきた！」: デッキの上から1枚をホロパワーにした`);
    },
  },
};
