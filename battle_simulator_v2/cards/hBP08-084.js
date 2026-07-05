/**
 * 夏色まつり (hBP08-084) 黄・1st・HP190（#JP #1期生 #シューター）
 *
 * コラボエフェクト「優雅なてぃーたいむ！」:
 *   自分のライフが3以下なら、このターンの間、自分のステージの#1期生を持つホロメン全員のアーツ+20。
 *   → 「3以下」= player.life.length <= 3。条件を満たすときのみ addTurnModifier を1つ付与し、
 *     match で「自分のステージにいて #1期生 を持つホロメン」を毎回判定する（全員対象。
 *     ターン中に出入りするホロメンにも match が追従する）。アーツ+20。
 *
 * アーツ「まちゅだってお姫さま♡」(30+):
 *   自分のステージに#1期生を持つ2ndホロメンがいるなら、このアーツ+30。
 *   → dmgBonus(ctx): 自分のステージのいずれかのホロメンの一番上のカードが
 *     bloomLevel==='2nd' かつ #1期生 タグを持つなら +30。基本値30はエンジンが素点処理。
 *
 * 保留: なし（コラボエフェクト・アーツとも全文実装）。
 */
const TAG = '1期生';

export default {
  number: 'hBP08-084',

  collabEffect: {
    name: '優雅なてぃーたいむ！',
    *run(ctx) {
      if (ctx.player.life.length > 3) {
        ctx.log('自分のライフが4以上のため、優雅なてぃーたいむ！は発動しない');
        return;
      }
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 20,
        ownerIdx: ctx.playerIdx,
        match: (h) => ctx.hasTag(h.stack[0], TAG),
        description: `このターンの間、自分の#${TAG}を持つホロメン全員のアーツ+20`,
      });
    },
  },

  arts: {
    'まちゅだってお姫さま♡': {
      // 自分のステージに#1期生を持つ2ndホロメンがいるなら +30
      dmgBonus(ctx) {
        const has2nd = ctx.holomems('self').some(
          (e) => e.top.bloomLevel === '2nd' && ctx.hasTag(e.top, TAG));
        return has2nd ? 30 : 0;
      },
    },
  },
};
