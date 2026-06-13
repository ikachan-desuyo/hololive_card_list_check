/**
 * 音乃瀬奏 (hBP08-082) ホロメン・黄・2nd・HP190（DEV_IS/ReGLOSS/歌）
 *
 * [コラボエフェクト] めでたい日なのに……:
 *   自分のステージのエールの枚数が相手より多いなら、このターンの間、このホロメンのアーツ+40。
 *   → 自分のステージ上の全ホロメンに付いているエール総数を数え、相手のステージの総数より
 *     「多い」（厳密に大なり。同数は不可）場合のみ、このホロメン（ctx.sourceHolomem）に
 *     ターン限定の artsPlus+40 を付与する。選択は無いので yield しない。
 *
 * [アーツ] 涙が止まらないよ～（100 / yellow+any、特攻: 白+50）: テキスト効果なし（素点＋特攻のみ）。
 *
 * 保留: なし。
 */
const countStageCheers = (entries) =>
  entries.reduce((sum, e) => sum + e.holomem.cheers.length, 0);

export default {
  number: 'hBP08-082',

  collabEffect: {
    name: 'めでたい日なのに……',
    *run(ctx) {
      const selfCheers = countStageCheers(ctx.holomems('self'));
      const oppCheers = countStageCheers(ctx.holomems('opp'));
      if (selfCheers <= oppCheers) {
        ctx.log(`エール枚数が相手より多くない（自分${selfCheers}/相手${oppCheers}）`);
        return;
      }
      const self = ctx.sourceHolomem;
      if (!self) return;
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 40,
        ownerIdx: ctx.playerIdx,
        match: (h) => h === self,
        description: `このターンの間、${self.stack[0].name}のアーツ+40`,
      });
    },
  },
};
