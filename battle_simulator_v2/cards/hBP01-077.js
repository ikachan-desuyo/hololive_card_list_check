/**
 * 星街すいせい (hBP01-077) 青・Debut・HP70（#JP #0期生 #歌）
 * コラボエフェクト「煌きのワードローブ」:
 *   自分の推しホロメンが〈星街すいせい〉の時、このホロメンの青エール1枚をアーカイブできる：自分のデッキを2枚引く。
 *   → コラボした時に1回だけ誘発（13.2）。推しが〈星街すいせい〉でなければ発動しない。
 *     「アーカイブできる」= 任意コスト。払えば2枚引く。
 * アーツ「新しい衣装」(30): テキスト効果なし。
 */
export default {
  number: 'hBP01-077',
  collabEffect: {
    name: '煌きのワードローブ',
    *run(ctx) {
      // 発動条件: 自分の推しホロメンが〈星街すいせい〉
      if (!ctx.nameIs(ctx.player.oshi, '星街すいせい')) {
        ctx.log('推しホロメンが〈星街すいせい〉ではないため発動しない');
        return;
      }
      const blueCheers = ctx.sourceHolomem.cheers.filter((c) => (c.color || '').includes('青'));
      if (blueCheers.length === 0) return;
      // コスト: このホロメンの青エール1枚をアーカイブ（任意）
      const cheer = yield ctx.chooseCard({
        cards: blueCheers,
        title: 'コスト: アーカイブする青エールを選択（デッキを2枚引く）',
        optional: true,
        skipLabel: '発動しない',
      });
      if (!cheer) return;
      yield* ctx.archiveCheer(ctx.sourceHolomem, cheer);
      ctx.draw(2);
    },
  },
};
