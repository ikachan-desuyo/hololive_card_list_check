/**
 * ムーナ・ホシノヴァ (hBP06-048) 青・Debut・HP100（#ID #ID1期生 #歌）
 * アーツ「ムーンペース」(20):
 *   このホロメンに青以外のエールが付いているなら、相手のバックホロメン1人に特殊ダメージ10を与える。
 *   ただし、ダウンしても相手のライフは減らない。
 *   → 通常ダメージ20の後、条件付きで特殊ダメージ10（noLifeOnDown）を追加（arts.run）
 */
export default {
  number: 'hBP06-048',
  arts: {
    'ムーンペース': {
      *run(ctx) {
        // 「青以外のエール」= このホロメンに付いているエールのうち、色が青でないものが1枚でもあるか
        const hasNonBlueCheer = (ctx.sourceHolomem.cheers || [])
          .some((c) => c.color && c.color !== '青');
        if (!hasNonBlueCheer) return;
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.pos.zone === 'back',
          title: '特殊ダメージ10を与える相手のバックホロメンを選択',
        });
        if (target) yield* ctx.dealSpecialDamage(target, 10, { noLifeOnDown: true });
      },
    },
  },
};
