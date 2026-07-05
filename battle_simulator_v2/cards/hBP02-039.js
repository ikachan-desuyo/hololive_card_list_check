/**
 * 沙花叉クロヱ (hBP02-039) ホロメン・青・1st・HP130（#JP #秘密結社holoX #海）
 *
 * [キーワード/ギフト] ぷいぷいぷい～:
 *   [ターンに1回]このホロメンのアーツ「ホロックスロット」でカードを公開した時、
 *   公開したサポートカード1枚を、アーカイブするかわりに手札に加えられる。
 *   → このギフトはアーツ「ホロックスロット」の公開時にしか誘発しないため、
 *     独立フックは作らずアーツ run の中で直接処理する（ターンに1回は oncePerTurn キーで管理）。
 *
 * [アーツ] ホロックスロット (20+):
 *   自分のデッキの上から3枚を公開できる：公開したホロメン1枚につき、このアーツ+20。
 *   そして公開したカードをアーカイブする。
 *   → 「公開できる」=任意（confirm）。+20 は公開したホロメンの枚数で計算。
 *     公開後、ギフトでサポート1枚を手札に残せる。残りはアーカイブする。
 */
export default {
  number: 'hBP02-039',
  arts: {
    'ホロックスロット': {
      *run(ctx) {
        if (ctx.player.deck.length === 0) return;
        const ok = yield ctx.confirm('デッキの上から3枚を公開しますか？（公開ホロメン1枚につきこのアーツ+20）');
        if (!ok) return;

        const seen = ctx.lookTopDeck(3);
        if (seen.length === 0) return;
        seen.forEach((c) => ctx.flashReveal && ctx.flashReveal(c));

        // 公開したホロメン1枚につき +20
        const holomemCount = seen.filter((c) => c.kind === 'holomen').length;
        if (holomemCount > 0) ctx.addArtBonus(holomemCount * 20, `公開ホロメン${holomemCount}枚`);

        // ギフト「ぷいぷいぷい～」: [ターンに1回] 公開したサポート1枚をアーカイブせず手札に加えられる
        let kept = null;
        const supports = seen.filter((c) => c.kind === 'support');
        if (supports.length > 0 && !ctx.oncePerTurnUsed('hBP02-039-gift')) {
          kept = yield ctx.chooseCard({
            cards: supports,
            title: '【ぷいぷいぷい～】公開したサポート1枚を手札に加える（アーカイブしない）',
            displayCards: seen.filter((c) => c.kind !== 'support'),
            optional: true,
            skipLabel: '手札に加えない',
          });
          if (kept) {
            ctx.markOncePerTurn('hBP02-039-gift');
            ctx.addToHand(kept, { reveal: true });
          }
        }

        // 公開したカード（手札に残したもの以外）をアーカイブする
        const rest = ctx.player.revealed.filter((c) => seen.includes(c) && c !== kept);
        for (const c of rest) {
          ctx._unreveal(c);
          ctx.player.archive.push(c);
        }
        if (rest.length > 0) ctx.log(`${ctx.player.name}: 公開した${rest.length}枚をアーカイブした`);
        ctx.recordDeckArchive(rest.length);
      },
    },
  },
};
