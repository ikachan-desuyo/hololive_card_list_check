/**
 * 尾丸ポルカ (hBP07-044) 赤・2nd・HP200（#JP #5期生 #ケモミミ）
 * アーツ「スタッフファーストです！」(120 / 赤赤, 特攻 紫+50):
 *   自分のデッキの上から2枚をアーカイブする。
 *   その後、自分のアーカイブのスタッフ1枚を手札に戻せる（「戻せる」=任意/0可）。
 *
 * ※キーワード/ギフト「The Show Must Go On」は未実装:
 *   [センター・コラボ限定]相手のターンで、自分のファンが付いているBuzzホロメンが
 *   ダウンした時、推しが〈尾丸ポルカ〉なら自分の減るライフ-1。
 *   → 減るライフを減らす被ダメージ割り込み（ライフ変動の抑制）であり、
 *      エンジンに該当機構が無いため保留。
 */
export default {
  number: 'hBP07-044',
  arts: {
    'スタッフファーストです！': {
      *run(ctx) {
        // デッキの上から2枚をアーカイブ（強制）
        const looked = ctx.lookTopDeck(2); // 解決領域(revealed)に置かれる
        for (const c of looked) {
          ctx._unreveal(c);
          ctx.player.archive.push(c);
          ctx.log(`${c.name} をアーカイブした`);
        }
        // その後、アーカイブのスタッフ1枚を手札に戻せる（任意）
        const staffs = ctx.player.archive.filter(
          (c) => c.kind === 'support' && c.supportType === 'スタッフ',
        );
        if (staffs.length === 0) return;
        const picked = yield ctx.chooseCard({
          cards: staffs,
          title: '手札に戻すスタッフを選択',
          optional: true,
          skipLabel: '戻さない',
        });
        if (!picked) return;
        ctx.removeFromArchive(picked);
        ctx.addToHand(picked);
      },
    },
  },
};
