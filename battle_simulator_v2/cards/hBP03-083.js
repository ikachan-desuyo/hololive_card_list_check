/**
 * 音乃瀬奏 (hBP03-083) Buzzホロメン #DEV_IS #ReGLOSS
 * ギフト「なんちゅーこった」: 相手のパフォーマンスステップが終了する時、そのパフォーマンスステップに
 *   自分のライフが減っていたら、自分のアーカイブのエール1枚を自分のホロメンに送る。
 *   → triggers.onOpponentPerformanceEnd（ctx.lifeDecreasedThisPerf でライフ減少を判定）
 *   対象は自分のステージの任意のホロメン（必須効果。エールがあれば送る）。
 * アーツ「歌姫 音乃瀬奏さん」(120): テキスト効果なし。
 */
export default {
  number: 'hBP03-083',
  triggers: {
    *onOpponentPerformanceEnd(ctx) {
      if (!ctx.lifeDecreasedThisPerf) return;
      const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
      if (cheers.length === 0 || ctx.holomems('self').length === 0) return;
      const cheer = yield ctx.chooseCard({ cards: cheers, title: 'ホロメンに送るアーカイブのエールを選択' });
      if (!cheer) return;
      const target = yield ctx.chooseHolomem({ side: 'self', title: 'エールを送るホロメンを選択' });
      if (!target) return;
      ctx.removeFromArchive(cheer);
      ctx.attachCheer(cheer, target.holomem);
    },
  },
};
