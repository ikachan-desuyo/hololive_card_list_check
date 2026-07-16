/**
 * 角巻わため (hBP05-072) 黄・Buzz・1st・HP250（#4期生,#歌）
 * アーツ「君と色違いのリュック」(50+): [センターポジション限定]このホロメンにエールが4枚以上
 *   付いているなら、このターンの間、このホロメンと自分のコラボホロメンのアーツ+50。
 * アーツ「わためと海辺デート」(80): 自分の推しホロメンが〈角巻わため〉なら、
 *   自分のエールデッキの上から1枚を自分の〈角巻わため〉に送れる。
 *   →「送れる」= 任意（送り先の選択に「選ばない」肢あり）。
 */
export default {
  number: 'hBP05-072',
  arts: {
    '君と色違いのリュック': {
      *run(ctx) {
        if (ctx.engine._zoneOf(ctx.sourceHolomem) !== 'center') return;
        if (ctx.sourceHolomem.cheers.length < 4) return;
        const src = ctx.sourceHolomem;
        ctx.addTurnModifier({
          kind: 'artsPlus', amount: 50, ownerIdx: ctx.playerIdx,
          // このホロメン と コラボホロメン
          match: (h) => h === src || ctx.engine._zoneOf(h) === 'collab',
          description: 'このターン、このホロメンとコラボのアーツ+50',
        });
      },
    },
    'わためと海辺デート': {
      *run(ctx) {
        if (!ctx.player.oshi || !ctx.nameIs(ctx.player.oshi, '角巻わため')) return;
        const targets = ctx.holomems('self', (e) => ctx.nameIs(e.top, '角巻わため'));
        if (targets.length === 0) return;
        // 「送れる」= 任意（送らない選択ができる）
        const entry = yield ctx.chooseHolomem({
          side: 'self', filter: (e) => ctx.nameIs(e.top, '角巻わため'),
          title: 'エールデッキの上から1枚を送る〈角巻わため〉を選択（任意）',
          optional: true,
        });
        if (entry) ctx.sendCheerFromCheerDeckTop(entry.holomem);
      },
    },
  },
};
