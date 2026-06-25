/**
 * 虎金妃笑虎 (hSD11-006) 黄・2nd・HP210（#DEV_IS #FLOW #GLOW）
 *
 * アーツ「虎嘯風生」(40+, メイン[黄] / 特攻 赤+50):
 *   このホロメンのエールを好きな枚数アーカイブできる：
 *   アーカイブしたエール1枚につき、このアーツ+40。
 *   → arts.虎嘯風生.run でエールを任意枚数（0枚可）アーカイブし、枚数×40を addArtBonus。
 *
 * キーワード/ギフト「戯笑の使者」:
 *   自分のパフォーマンスステップが開始する時、自分の手札の#FLOW GLOWを持つホロメン1枚を
 *   アーカイブできる：自分のアーカイブの黄エール1枚を自分の〈虎金妃笑虎〉に送る。
 *   → triggers.onPerformanceStepStart で実装（自分のパフォーマンス開始時。コスト=手札の#FLOW GLOW
 *     ホロメン1枚アーカイブ、効果=アーカイブの黄エール1枚をこのホロメンへ送る）。
 */
export default {
  number: 'hSD11-006',
  triggers: {
    *onPerformanceStepStart(ctx) {
      if (ctx.state.turnPlayer !== ctx.playerIdx) return; // 自分のパフォーマンスステップ
      const isFG = (c) => (c.tags || []).includes('FLOW') && (c.tags || []).includes('GLOW');
      const fgHand = ctx.player.hand.filter((c) => c.kind === 'holomen' && isFG(c));
      const yellows = ctx.player.archive.filter((c) => c.kind === 'cheer' && c.color === '黄');
      if (fgHand.length === 0 || yellows.length === 0) return;
      // コスト: 手札の#FLOW GLOWホロメン1枚をアーカイブ（任意）
      const toArchive = yield ctx.chooseCard({ cards: fgHand, title: '手札の#FLOW GLOWホロメンをアーカイブして黄エールを送る？（任意）', optional: true });
      if (!toArchive) return;
      ctx.removeFromHand(toArchive);
      ctx.player.archive.push(toArchive);
      // 効果: アーカイブの黄エール1枚をこのホロメン（笑虎）に送る
      const cheer = yield ctx.chooseCard({ cards: ctx.player.archive.filter((c) => c.kind === 'cheer' && c.color === '黄'), title: 'このホロメンに送る黄エールを選択' });
      if (cheer) { ctx.removeFromArchive(cheer); ctx.attachCheer(cheer, ctx.sourceHolomem); }
    },
  },
  arts: {
    '虎嘯風生': {
      *run(ctx) {
        // 「好きな枚数」=0枚も可。このホロメンのエールを一度に選んでアーカイブし、枚数×40を加算。
        const archived = yield ctx.chooseCards({
          cards: [...ctx.sourceHolomem.cheers],
          min: 0,
          title: 'このアーツ+40するためアーカイブするエールを選択（好きな枚数）',
        });
        for (const cheer of archived) yield* ctx.archiveCheer(ctx.sourceHolomem, cheer);
        if (archived.length > 0) {
          ctx.addArtBonus(archived.length * 40, `エール${archived.length}枚をアーカイブ`);
        }
      },
    },
  },
};
