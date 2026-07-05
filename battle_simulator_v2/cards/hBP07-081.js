/**
 * 桃鈴ねね (hBP07-081)
 * コラボエフェクト「桃鈴ねねは昆虫博士になる！」: 自分のホロパワーが4枚以上で、相手のコラボホロメンがいないなら、
 *   相手は、自身のバックホロメン1人をコラボポジションに移動させる（移動はコラボとしては扱わない）。
 *   → 相手の決定ポイント（opponentChoosesHolomem）→ moveToCollabOwner。
 * アーツ「君のハートをブルロック！」: このホロメンに〈ギラファノコギリクワガタ〉が付いているなら、
 *   このアーツダメージは、アーツの対象のホロメンのかわりに、相手のセンターホロメンとコラボホロメンに与える。
 *   → arts.redirectTargets（ギラファ付きで対象を相手センター＋コラボに差し替え。engine が複数対象へ適用）。
 */
export default {
  number: 'hBP07-081',
  collabEffect: {
    name: '桃鈴ねねは昆虫博士になる！',
    *run(ctx) {
      if (ctx.player.holoPower.length < 4) return;
      if (ctx.opponent.collab) return; // 相手のコラボがいない時のみ
      const backs = ctx.holomems('opp', (e) => e.pos.zone === 'back');
      if (backs.length === 0) return;
      const entry = yield ctx.opponentChoosesHolomem({
        filter: (e) => e.pos.zone === 'back',
        title: 'コラボポジションに移動させるバックホロメンを選ぶ（昆虫博士）',
      });
      if (entry) ctx.moveToCollabOwner(entry.holomem);
    },
  },
  arts: {
    '君のハートをブルロック！': {
      redirectTargets(ctx) {
        const has = (ctx.sourceHolomem?.attachments || []).some((a) => a.name === 'ギラファノコギリクワガタ');
        if (!has) return null; // 通常通り（指定対象に与える）
        return [ctx.opponent.center, ctx.opponent.collab].filter(Boolean);
      },
    },
  },
};
