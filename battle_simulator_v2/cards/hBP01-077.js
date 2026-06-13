/**
 * 星街すいせい (hBP01-077) 青・Debut・HP70（#JP #0期生 #歌）
 * キーワード「煌きのワードローブ」:
 *   自分の推しホロメンが〈星街すいせい〉の時、このホロメンの青エール1枚をアーカイブできる：自分のデッキを2枚引く。
 *   → メインステップの起動型能力（コスト: 推しが〈星街すいせい〉＋このホロメンの青エール1枚をアーカイブ）
 *      ターン制限の記載が無いため oncePerTurn なし。
 * アーツ「新しい衣装」(30): テキスト効果なし。
 */
export default {
  number: 'hBP01-077',
  activatedAbilities: [{
    name: '煌きのワードローブ',
    oncePerTurn: false, // ターン制限の記載なし
    canUse(ctx) {
      if (ctx.player.oshi?.name !== '星街すいせい') return false;
      return ctx.sourceHolomem.cheers.some((c) => c.color === '青');
    },
    *run(ctx) {
      if (ctx.player.oshi?.name !== '星街すいせい') return;
      const blueCheers = ctx.sourceHolomem.cheers.filter((c) => c.color === '青');
      if (blueCheers.length === 0) return;
      const cheer = yield ctx.chooseCard({
        cards: blueCheers,
        title: 'コスト: アーカイブする青エールを選択',
      });
      if (!cheer) return;
      ctx.archiveCheer(ctx.sourceHolomem, cheer);
      ctx.draw(2);
    },
  }],
};
