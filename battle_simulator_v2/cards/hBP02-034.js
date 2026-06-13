/**
 * 百鬼あやめ (hBP02-034) 赤・1st・HP250・Buzzホロメン（#JP #2期生 #シューター）
 * アーツ「余は草」(50): 追加効果なし（基本ダメージのみ。エンジンが処理）。
 * アーツ「オーガニックショット」(80):
 *   このホロメンにツールかマスコットが付いている時、
 *   相手のセンターホロメンかコラボホロメンに特殊ダメージ30を与える。
 *   → arts.run で装着判定し、対象を選ばせて特殊ダメージ30。
 */
export default {
  number: 'hBP02-034',
  arts: {
    'オーガニックショット': {
      *run(ctx) {
        const hasToolOrMascot = ctx.sourceHolomem?.attachments?.some(
          (a) => a.supportType === 'ツール' || a.supportType === 'マスコット');
        if (!hasToolOrMascot) return;
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'collab',
          title: '特殊ダメージ30を与える相手ホロメンを選択（センターかコラボ）',
        });
        if (target) yield* ctx.dealSpecialDamage(target, 30);
      },
    },
  },
};
