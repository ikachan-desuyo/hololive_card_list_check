/**
 * ラプラス・ダークネス (hBP06-071) 紫・2nd・HP200（#JP #秘密結社holoX #シューター）
 * アーツ「らぷらすといっしょ！」(80+ / 紫紫 / 特攻 黄+50):
 *   サイコロを3回振る。奇数が出た回数1回につき、このアーツ+20。
 * アーツ「みんなかつもくせよ！」(150 / 紫紫紫紫紫 / 特攻 黄+50):
 *   サイコロを5回振る。奇数が出た回数1回につき、自分のデッキを1枚引き、
 *   相手のセンターホロメンとコラボホロメンに特殊ダメージ30を与える。
 */
export default {
  number: 'hBP06-071',
  arts: {
    'らぷらすといっしょ！': {
      *run(ctx) {
        let odds = 0;
        for (let i = 0; i < 3; i++) {
          if (ctx.rollDice() % 2 === 1) odds++;
        }
        ctx.log(`奇数が${odds}回出た`);
        if (odds > 0) ctx.addArtBonus(odds * 20, `奇数${odds}回ぶんアーツ+${odds * 20}`);
      },
    },
    'みんなかつもくせよ！': {
      *run(ctx) {
        let odds = 0;
        for (let i = 0; i < 5; i++) {
          if (ctx.rollDice() % 2 === 1) odds++;
        }
        ctx.log(`奇数が${odds}回出た`);
        // 奇数が出た回数1回につき、「デッキを1枚引き、相手のセンター/コラボに特殊ダメージ30」を1セット実行
        for (let i = 0; i < odds; i++) {
          ctx.draw(1);
          for (const e of ctx.holomems('opp', (x) => x.pos.zone === 'center' || x.pos.zone === 'collab')) {
            ctx.dealSpecialDamage(e, 30);
          }
        }
      },
    },
  },
};
