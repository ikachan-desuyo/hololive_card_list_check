/**
 * 凸待ち (hBP03-088) サポート・イベント LIMITED
 * 使用条件: 自分のライフが相手より少ない時のみ。
 * 効果: 相手のコラボホロメンがいない時、相手は、自身のバックホロメン1人をコラボポジションに移動させる
 *   （移動はコラボとしては扱わない）。
 *   → 相手の決定ポイント（opponentChoosesHolomem）。移動は moveToCollabOwner（onCollab等は誘発しない）。
 * LIMITED：ターンに1枚しか使えない（engine 側で c.limited を制御）。
 */
export default {
  number: 'hBP03-088',
  support: {
    canUse(ctx) {
      // 自分のライフが相手より少ない時のみ
      if (ctx.player.life.length >= ctx.opponent.life.length) return false;
      // 移動対象が無い（相手コラボが埋まっている／相手バックにホロメンがいない）なら何も起きないので使用不可 (Q348)
      return !ctx.opponent.collab && ctx.holomems('opp', (e) => e.pos.zone === 'back').length > 0;
    },
    *run(ctx) {
      if (ctx.opponent.collab) return; // 相手のコラボがいる時は何もしない
      const backs = ctx.holomems('opp', (e) => e.pos.zone === 'back');
      if (backs.length === 0) return;
      const entry = yield ctx.opponentChoosesHolomem({
        filter: (e) => e.pos.zone === 'back',
        title: 'コラボポジションに移動させるバックホロメンを選ぶ（凸待ち）',
      });
      if (entry) ctx.moveToCollabOwner(entry.holomem);
    },
  },
};
