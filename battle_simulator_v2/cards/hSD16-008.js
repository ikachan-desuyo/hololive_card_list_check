/**
 * さくらみこ (hSD16-008) 赤・1st・HP140（#JP #0期生 #ベイビー）
 * コラボエフェクト「待ってたにぇ」:
 *   サイコロを1回振る。3か5なら、自分のアーカイブの〈35P〉1枚を手札に戻す。
 * アーツ「いっぱい遊ぼっ」(30): 効果なし（ダメージのみ）。
 *
 * 保留: なし。
 */
export default {
  number: 'hSD16-008',
  collabEffect: {
    name: '待ってたにぇ',
    *run(ctx) {
      // 「サイコロを1回振る」=強制（任意ではない）
      const value = (yield* ctx.rollDice());
      if (value !== 3 && value !== 5) {
        ctx.log('出目が3でも5でもないため効果なし');
        return;
      }
      // 〈35P〉=カード名「35P」一致
      const cands = ctx.player.archive.filter((c) => ctx.nameIs(c, '35P'));
      if (cands.length === 0) {
        ctx.log('アーカイブに〈35P〉がない');
        return;
      }
      // 「1枚を手札に戻す」=候補があれば戻す（強制）。どの1枚かは選択
      const picked = yield ctx.chooseCard({
        cards: cands,
        title: 'アーカイブから手札に戻す〈35P〉を選択',
      });
      if (picked) {
        ctx.removeFromArchive(picked);
        ctx.addToHand(picked, { reveal: true });
      }
    },
  },
};
