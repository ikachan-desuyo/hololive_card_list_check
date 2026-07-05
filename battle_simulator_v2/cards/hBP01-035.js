/**
 * アキ・ローゼンタール (hBP01-035) 緑・1st・HP120（#JP #1期生 #ハーフエルフ #お酒）
 * ブルームエフェクト「ブレーメンの音楽祭」:
 *   自分のアーカイブのツール1枚を自分のホロメンに付けられる。（任意）
 *   → 付け先はツールの付け先ルール（_canAttachSupport）を満たすホロメンのみ。
 *     付ける時のトリガー（onAttach）があれば誘発させる。
 * アーツ「アキロゼ幻想曲」(40):
 *   このホロメンにツールが付いている時、自分のエールデッキの上から1枚を、自分のホロメンに送る。
 */
export default {
  number: 'hBP01-035',
  bloomEffect: {
    name: 'ブレーメンの音楽祭',
    *run(ctx) {
      const tools = ctx.player.archive.filter((c) => c.supportType === 'ツール');
      if (tools.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: tools,
        title: 'ホロメンに付けるアーカイブのツールを選択（任意）',
        optional: true,
        skipLabel: '付けない',
      });
      if (!picked) return;
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.engine._canAttachSupport(e.holomem, picked),
        title: `${picked.name} を付ける自分のホロメンを選択`,
        optional: true,
      });
      if (!target) return;
      ctx.removeFromArchive(picked);
      yield* ctx.attachSupportWithTrigger(picked, target.holomem);
    },
  },
  arts: {
    'アキロゼ幻想曲': {
      *run(ctx) {
        // 条件: このホロメンにツールが付いている時
        const hasTool = ctx.sourceHolomem.attachments.some((a) => a.supportType === 'ツール');
        if (!hasTool) return;
        if (ctx.player.cheerDeck.length === 0) return;
        const target = yield ctx.chooseHolomem({
          side: 'self',
          title: 'エールデッキの上から1枚を送る自分のホロメンを選択',
        });
        if (!target) return;
        ctx.sendCheerFromCheerDeckTop(target.holomem);
      },
    },
  },
};
