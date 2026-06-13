/**
 * 角巻わため (hBP03-071) 黄・1st・HP160（#JP #4期生 #ケモミミ #歌）
 * ブルームエフェクト「Member sheep おかえり～」:
 *   自分のアーカイブの〈わためいと〉1枚を手札に戻せる。（任意。0枚可＝戻さなくてよい）
 *
 * アーツ「つのまきじゃんけん」(50): ※未実装（保留）
 *   「相手と勝敗が決まるまでじゃんけんできる：自分が勝った時、このターンの間、
 *    このホロメンは赤特攻+30を得る。」
 *   保留理由:
 *     ① じゃんけん（相手の選択を伴い勝敗が決まるまで繰り返す）の機構がエンジンに存在しない。
 *     ② ターン限定の「赤特攻+N」を表す修正種別が無い。特攻はアーツ静的定義 art.tokkou
 *        からのみ読まれ、addTurnModifier に特攻(tokkou)kind が無いため動的付与できない。
 *   → じゃんけん機構＋特攻ターン修正が実装されたら arts.'つのまきじゃんけん' を追加すること。
 */
export default {
  number: 'hBP03-071',
  bloomEffect: {
    name: 'Member sheep おかえり～',
    *run(ctx) {
      const candidates = ctx.player.archive.filter((c) => c.name === 'わためいと');
      if (candidates.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: 'アーカイブから手札に戻す〈わためいと〉を選択（任意）',
        optional: true,
        skipLabel: '戻さない',
      });
      if (!picked) return;
      ctx.removeFromArchive(picked);
      ctx.addToHand(picked);
    },
  },
};
