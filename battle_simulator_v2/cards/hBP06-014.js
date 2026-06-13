/**
 * ラオーラ・パンテーラ (hBP06-014) 白・2nd・HP210（#EN #Justice #ケモミミ #絵）
 *
 * アーツ「色彩のリナシメント」(100, 特攻 紫+50):
 *   [センターポジション限定]このターンの間、自分の#絵を持つコラボホロメンのアーツ+50し、
 *   そのホロメンのアーツに必要な無色-1。
 *   → arts.run: センター限定を確認し、解決時にステージのコラボ位置にいる#絵ホロメンを対象に
 *     ターン修正（artsPlus+50 / artCostReduce 無色-1）を付与する。
 *
 * ギフト「夢紡ぎのアトリエ」: このホロメンがアーツを使った時、自分のホロパワーを見て1枚を公開し手札に加え、
 *   手札に加えたなら自分の手札1枚をホロパワーにする。そしてホロパワーをシャッフルする。
 *   → triggers.onArtsUse（アーツ解決後に発火）
 */
export default {
  number: 'hBP06-014',
  triggers: {
    *onArtsUse(ctx) {
      const p = ctx.player;
      if (p.holoPower.length === 0) return;
      const picked = yield ctx.chooseCard({ cards: p.holoPower, title: 'ホロパワーから手札に加えるカードを選択' });
      if (!picked) return;
      p.holoPower.splice(p.holoPower.indexOf(picked), 1);
      ctx.addToHand(picked);
      if (p.hand.length > 0) {
        const back = yield ctx.chooseCard({ cards: p.hand, title: 'ホロパワーにする手札を選択' });
        if (back) { ctx.removeFromHand(back); p.holoPower.push(back); ctx.log('手札1枚をホロパワーにした'); }
      }
      ctx.engine._shuffle(p.holoPower);
      ctx.log('ホロパワーをシャッフルした');
    },
  },
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
