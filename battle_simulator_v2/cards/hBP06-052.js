/**
 * ムーナ・ホシノヴァ (hBP06-052) 青・1st・Buzzホロメン・HP240（#ID #ID1期生 #歌）
 *
 * アーツ「下弦の月」(20+):
 *   自分の推しホロメンが〈ムーナ・ホシノヴァ〉で、このホロメンにエールが4枚以上付いているなら、このアーツ+60。
 *   → arts.下弦の月.dmgBonus で実装。
 *
 * ギフト/キーワード「新月」:
 *   このホロメンが相手のホロメンにアーツダメージを与えた時に使える：
 *   その相手のホロメンに、そのホロメンが受けているダメージと同じ数値の特殊ダメージを与える。
 *   → arts.onDamageDealt（アーツでダメージを与えた後に発火・ダウン非依存）で実装。
 *     アーツが当たった相手ホロメン(ctx.attackInfo.dealtList)に、その時点の被ダメージと同値の特殊ダメージを与える（任意）。
 */
export default {
  number: 'hBP06-052',
  arts: {
    '下弦の月': {
      dmgBonus(ctx) {
        const oshiOk = ctx.player.oshi?.name === 'ムーナ・ホシノヴァ';
        const cheerOk = (ctx.sourceHolomem?.cheers.length || 0) >= 4;
        return oshiOk && cheerOk ? 60 : 0;
      },
      // ギフト「新月」: アーツダメージを与えた相手に、そのホロメンが受けているダメージと同じ特殊ダメージ（任意）
      *onDamageDealt(ctx) {
        const targets = (ctx.attackInfo?.dealtList || []).map((d) => d.target).filter(Boolean);
        if (targets.length === 0) return;
        const ok = yield ctx.confirm('「新月」: 与えた相手に、受けているダメージと同じ数値の特殊ダメージを与える？');
        if (!ok) return;
        for (const t of targets) {
          const amount = t.damage; // そのホロメンが受けているダメージと同じ数値
          if (amount > 0) yield* ctx.dealSpecialDamage({ holomem: t, top: t.stack[0] }, amount);
        }
      },
    },
  },
};
