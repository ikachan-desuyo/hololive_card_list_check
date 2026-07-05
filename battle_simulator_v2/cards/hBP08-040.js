/**
 * 百鬼あやめ (hBP08-040) 赤・Buzzホロメン・HP220・1st（#JP #2期生 #シューター）
 *
 * コラボエフェクト「桜の気配に誘われて」:
 *   このホロメンに〈鬼神刀「阿修羅」〉が付いていて、相手のコラボホロメンがいないなら、
 *   相手は、自身のバックホロメン1人をコラボポジションに移動させる（移動はコラボとしては扱わない）。
 *   → collabEffect.run: sourceHolomem に〈鬼神刀「阿修羅」〉が付いていて相手コラボが空の時のみ、
 *     相手の決定ポイント（opponentChoosesHolomem）でバック1人を選ばせ、moveToCollabOwner で移動。
 *     hBP07-081（条件がホロパワー枚数）と同型で、条件を装着カード判定に置き換えたもの。
 *
 * アーツ「お花見デート」(30+):
 *   自分のアーカイブの赤エール1枚につき、このアーツ+10。
 *   → dmgBonus(ctx): 自分のアーカイブ内の赤エール枚数 × 10。
 *
 * 保留: なし（コラボエフェクト・アーツとも全文実装）。
 */
export default {
  number: 'hBP08-040',

  collabEffect: {
    name: '桜の気配に誘われて',
    *run(ctx) {
      const hasSword = (ctx.sourceHolomem?.attachments || [])
        .some((a) => a.name === '鬼神刀「阿修羅」');
      if (!hasSword) return;
      if (ctx.opponent.collab) return; // 相手のコラボがいない時のみ
      const backs = ctx.holomems('opp', (e) => e.pos.zone === 'back');
      if (backs.length === 0) return;
      const entry = yield ctx.opponentChoosesHolomem({
        filter: (e) => e.pos.zone === 'back',
        title: 'コラボポジションに移動させるバックホロメンを選ぶ（桜の気配に誘われて）',
      });
      if (entry) ctx.moveToCollabOwner(entry.holomem);
    },
  },

  arts: {
    'お花見デート': {
      // 自分のアーカイブの赤エール1枚につき +10
      dmgBonus(ctx) {
        const reds = ctx.player.archive
          .filter((c) => c.kind === 'cheer' && c.color === '赤').length;
        return reds * 10;
      },
    },
  },
};
