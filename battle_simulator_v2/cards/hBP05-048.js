/**
 * こぼ・かなえる (hBP05-048) 青・1st・HP140（#ID3期生）
 * コラボエフェクト「幼馴染のドキドキ膝枕」: 相手のバックホロメン2人に特殊ダメージ10を与える。
 * アーツ「キミが元気になれるように」(40): 相手のバックホロメン2人に特殊ダメージ10を与える。
 */
// 相手のバックホロメン最大2人（別々）に特殊ダメージ10
function* dmgTwoBacks(ctx) {
  const used = new Set();
  for (let i = 0; i < 2; i++) {
    const backs = ctx.holomems('opp', (e) => e.pos.zone === 'back' && !used.has(e.holomem));
    if (backs.length === 0) break;
    const target = yield ctx.chooseHolomem({
      side: 'opp',
      filter: (e) => e.pos.zone === 'back' && !used.has(e.holomem),
      title: `特殊ダメージ10を与える相手バックホロメンを選択（${i + 1}/2）`,
    });
    if (!target) break;
    used.add(target.holomem);
    ctx.dealSpecialDamage(target, 10);
  }
}

export default {
  number: 'hBP05-048',
  collabEffect: {
    name: '幼馴染のドキドキ膝枕',
    *run(ctx) { yield* dmgTwoBacks(ctx); },
  },
  arts: {
    'キミが元気になれるように': {
      *run(ctx) { yield* dmgTwoBacks(ctx); },
    },
  },
};
