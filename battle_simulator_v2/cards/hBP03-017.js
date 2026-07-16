/**
 * 獅白ぼたん (hBP03-017) 緑・Debut・HP80（#JP #5期生 #ケモミミ #シューター）
 * キーワード/コラボエフェクト「プリペア」:
 *   自分の推しホロメンが〈獅白ぼたん〉の時、自分のエールデッキの上から1枚をアーカイブできる：
 *   自分のホロメン1人のHP10回復。
 *   → コラボした時に1回誘発（13.2）。「アーカイブできる」= 任意コスト（confirm でゲート）。
 * アーツ「ぼ。」(20): テキスト効果なし。
 */
export default {
  number: 'hBP03-017',
  collabEffect: {
    name: 'プリペア',
    *run(ctx) {
      // 条件: 自分の推しホロメンが〈獅白ぼたん〉
      if (!ctx.player.oshi || !ctx.nameIs(ctx.player.oshi, '獅白ぼたん')) return;
      if (ctx.player.cheerDeck.length === 0) return;
      // 「アーカイブできる」= 任意コスト
      const ok = yield ctx.confirm('プリペア: エールデッキの上から1枚をアーカイブしますか？（自分のホロメン1人のHP10回復）', 'アーカイブする', 'しない');
      if (!ok) return;
      // コスト: エールデッキの上から1枚をアーカイブ
      const top = ctx.player.cheerDeck.shift();
      if (!top) return;
      ctx.flashReveal(top);
      ctx.player.archive.push(top);
      ctx.log(`プリペア: エールデッキの上 ${top.name} をアーカイブ`);
      // 効果: 自分のホロメン1人のHP10回復
      const target = yield ctx.chooseHolomem({
        side: 'self',
        title: 'HP10回復する自分のホロメンを選択',
      });
      if (target) ctx.heal(target.holomem, 10);
    },
  },
};
