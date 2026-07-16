/**
 * 音乃瀬奏 (hBP03-083) Buzzホロメン #DEV_IS #ReGLOSS
 * ギフト「なんちゅーこった」: 相手のパフォーマンスステップが終了する時、そのパフォーマンスステップに
 *   自分のライフが減っていたら、自分のアーカイブのエール1枚をこのホロメンに送れる。
 *   → triggers.onOpponentPerformanceEnd（ctx.lifeDecreasedThisPerf でライフ減少を判定）
 *   送り先はギフト持ちのこのホロメン自身（ctx.sourceHolomem）固定。「送れる」＝任意効果。
 * アーツ「歌姫 音乃瀬奏さん」(120): テキスト効果なし。
 */
export default {
  number: 'hBP03-083',
  triggers: {
    *onOpponentPerformanceEnd(ctx) {
      if (!ctx.lifeDecreasedThisPerf) return;
      const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
      if (cheers.length === 0 || !ctx.sourceHolomem) return;
      // 「送れる」= 任意。送り先はこのホロメン自身
      const cheer = yield ctx.chooseCard({
        cards: cheers,
        title: 'このホロメンに送るアーカイブのエールを選択',
        optional: true,
        skipLabel: '送らない',
      });
      if (!cheer) return;
      ctx.removeFromArchive(cheer);
      ctx.attachCheer(cheer, ctx.sourceHolomem);
    },
  },
};
