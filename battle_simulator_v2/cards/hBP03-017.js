/**
 * 獅白ぼたん (hBP03-017) 緑・Debut・HP80（#JP #5期生 #ケモミミ #シューター）
 * キーワード/コラボエフェクト「プリペア」:
 *   自分の推しホロメンが〈獅白ぼたん〉の時、自分のエールデッキの上から1枚をアーカイブできる：
 *   自分のホロメン1人のHP10回復。
 *   → メインステップの起動型能力（コスト: エールデッキの上から1枚をアーカイブ）
 *      ターン回数制限の記載は無いので無制限。
 * アーツ「ぼ。」(20): テキスト効果なし。
 */
export default {
  number: 'hBP03-017',
  activatedAbilities: [{
    name: 'プリペア',
    oncePerTurn: false, // ターン制限の記載なし
    canUse(ctx) {
      // 自分の推しホロメンが〈獅白ぼたん〉の時のみ
      if (ctx.player.oshi?.name !== '獅白ぼたん') return false;
      // コスト: エールデッキの上から1枚をアーカイブできること
      if (ctx.player.cheerDeck.length < 1) return false;
      // HPが減っている自分のホロメンがいる時に意味がある
      return ctx.holomems('self', (e) => e.holomem.damage > 0).length > 0;
    },
    *run(ctx) {
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
  }],
};
