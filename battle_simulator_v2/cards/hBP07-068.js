/**
 * AZKi (hBP07-068) 紫・2nd・HP210（#JP #0期生 #歌）
 * コラボエフェクト「共に歩んできた軌跡」:
 *   このターンの間、自分のステージの異なるカード名の#0期生を持つホロメン1人につき、このホロメンのアーツ+20。
 *   → コラボ解決時点での「異なるカード名の#0期生ホロメン数」を数え、その人数×20を
 *     このホロメン（AZKi）のアーツへ加算する一時修正。
 * アーツ「ホワイトデーのお返し、待ってるね」(100, 特攻 黄+50):
 *   追加効果なし（特攻アイコンはエンジンが処理）。アーツ定義は不要。
 */
export default {
  number: 'hBP07-068',
  collabEffect: {
    name: '共に歩んできた軌跡',
    *run(ctx) {
      const self = ctx.sourceHolomem;
      // 自分のステージの #0期生 ホロメンを、異なるカード名で数える
      const names = new Set();
      for (const e of ctx.holomems('self', (h) => ctx.hasTag(h.top, '0期生'))) {
        if (e.top && e.top.name) names.add(e.top.name);
      }
      const amount = names.size * 20;
      if (amount <= 0) return;
      ctx.addTurnModifier({
        kind: 'artsPlus', amount, ownerIdx: ctx.playerIdx,
        match: (h) => h === self,
        description: `このターン、${self.stack[0].name} のアーツ+${amount}（異なる名前の#0期生 ${names.size}人）`,
      });
    },
  },
};
