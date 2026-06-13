/**
 * ラオーラ・パンテーラ (hBP06-014) 白・2nd・HP210（#EN #Justice #ケモミミ #絵）
 *
 * アーツ「色彩のリナシメント」(100, 特攻 紫+50):
 *   [センターポジション限定]このターンの間、自分の#絵を持つコラボホロメンのアーツ+50し、
 *   そのホロメンのアーツに必要な無色-1。
 *   → arts.run: センター限定を確認し、解決時にステージのコラボ位置にいる#絵ホロメンを対象に
 *     ターン修正（artsPlus+50 / artCostReduce 無色-1）を付与する。
 *
 * ※ キーワード/ギフト「夢紡ぎのアトリエ」（このホロメンがアーツを使った時、ホロパワーを見て1枚公開して
 *    手札に加え、手札1枚をホロパワーにしてシャッフルする）は未実装。
 *    「アーツを使った時(onArtsUse)」トリガーは現状のフックに無い（保留対象）。
 */
export default {
  number: 'hBP06-014',
  arts: {
    '色彩のリナシメント': {
      *run(ctx) {
        // [センターポジション限定]
        if (ctx.sourceHolomemPos()?.zone !== 'center') return;
        // 解決時にコラボ位置にいる #絵 ホロメンを対象にする
        const targets = ctx.holomems('self', (e) => e.pos.zone === 'collab' && ctx.hasTag(e.top, '絵'))
          .map((e) => e.holomem);
        if (targets.length === 0) return;
        const set = new Set(targets);
        const names = targets.map((h) => h.stack[0].name).join('、');
        ctx.addTurnModifier({
          kind: 'artsPlus', amount: 50, ownerIdx: ctx.playerIdx,
          match: (h) => set.has(h),
          description: `このターン、${names} のアーツ+50`,
        });
        ctx.addTurnModifier({
          kind: 'artCostReduce', color: '無色', amount: 1, ownerIdx: ctx.playerIdx,
          match: (h) => set.has(h),
          description: `このターン、${names} のアーツ必要無色-1`,
        });
      },
    },
  },
};
