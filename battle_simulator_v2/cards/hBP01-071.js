/**
 * 尾丸ポルカ (hBP01-071) 赤・Buzz・1st・HP240（#JP #5期生 #ケモミミ）
 * ブルームエフェクト「ポルカイリュージョン」:
 *   自分のアーカイブの〈座員〉1枚を手札に戻せる。
 *   → 〈座員〉= 名前が「座員」のカード（hBP01-126 のファン）。任意（「戻せる」=0可）。
 * アーツ「ポルカサーカス」(50+):
 *   自分のホロメン全員に付いているファン1枚につき、このアーツ+20。
 *   → 自分のステージ全ホロメンに付いている supportType==='ファン' の総数 × 20。
 */
export default {
  number: 'hBP01-071',
  bloomEffect: {
    name: 'ポルカイリュージョン',
    *run(ctx) {
      const seats = ctx.player.archive.filter((c) => c.name === '座員');
      if (seats.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: seats,
        title: 'アーカイブの〈座員〉1枚を手札に戻す',
        optional: true, // 「戻せる」=任意
      });
      if (!picked) return;
      ctx.removeFromArchive(picked);
      ctx.addToHand(picked, { reveal: false }); // 手札に戻す（非公開）
    },
  },
  arts: {
    'ポルカサーカス': {
      dmgBonus(ctx) {
        // 自分のホロメン全員に付いているファンの総数 × 20
        let fans = 0;
        for (const e of ctx.holomems('self')) {
          fans += e.holomem.attachments.filter((a) => a.supportType === 'ファン').length;
        }
        return fans * 20;
      },
    },
  },
};
