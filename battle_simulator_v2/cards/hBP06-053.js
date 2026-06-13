/**
 * ムーナ・ホシノヴァ (hBP06-053) 青・2nd・HP200（#ID #ID1期生 #歌）
 * コラボエフェクト「星の運命」:
 *   相手のセンターホロメンかコラボホロメンを選ぶ。
 *   選んだホロメンに、選んだホロメンが受けているダメージと同じ数値の特殊ダメージを与える。
 *   → 対象ホロメンの累計ダメージ(holomem.damage)と同値の特殊ダメージ
 * アーツ「Tidal Eclipse」(90):
 *   このホロメンにエールが4枚以上付いているなら、
 *   相手のセンターホロメンかコラボホロメンに特殊ダメージ90を与える。
 */
export default {
  number: 'hBP06-053',
  collabEffect: {
    name: '星の運命',
    *run(ctx) {
      const target = yield ctx.chooseHolomem({
        side: 'opp',
        filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'collab',
        title: '特殊ダメージを与える相手ホロメンを選択（センターかコラボ）',
      });
      if (!target) return;
      const amount = target.holomem.damage || 0; // 選んだホロメンが受けているダメージと同値
      if (amount <= 0) {
        ctx.log('選んだホロメンは受けているダメージが無いため特殊ダメージは0');
        return;
      }
      ctx.dealSpecialDamage(target, amount);
    },
  },
  arts: {
    'Tidal Eclipse': {
      *run(ctx) {
        // このホロメンに付いているエールが4枚以上
        if ((ctx.sourceHolomem?.cheers?.length || 0) < 4) return;
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'collab',
          title: '特殊ダメージ90を与える相手ホロメンを選択（センターかコラボ）',
        });
        if (target) ctx.dealSpecialDamage(target, 90);
      },
    },
  },
};
