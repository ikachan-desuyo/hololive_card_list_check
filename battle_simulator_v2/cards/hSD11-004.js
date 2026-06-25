/**
 * 虎金妃笑虎 (hSD11-004) 黄・1st・HP150（#DEV_IS #FLOW #GLOW）
 *
 * ブルームエフェクト「人を笑顔にするためならば」:
 *   自分のステージのエール2枚をアーカイブできる：
 *   自分のアーカイブの〈虎金妃笑虎〉1枚を手札に戻す。
 *   （コストは任意。エール2枚をアーカイブできない／戻すカードが無いなら不発）
 *
 * アーツ「自分の人生すらも捧げられる」(dmg:30):
 *   自分のエールデッキの上から1枚を自分の〈虎金妃笑虎〉に送れる。
 */
export default {
  number: 'hSD11-004',
  bloomEffect: {
    name: '人を笑顔にするためならば',
    *run(ctx) {
      // ステージ上の全エールを (holomem付き) で列挙
      const allCheers = [];
      for (const { holomem } of ctx.holomems('self')) {
        for (const cheer of holomem.cheers) allCheers.push({ cheer, holomem });
      }
      // アーカイブ内の〈虎金妃笑虎〉
      const targets = ctx.player.archive.filter((c) => c.name === '虎金妃笑虎');
      if (allCheers.length < 2 || targets.length === 0) return;

      const ok = yield ctx.confirm(
        'ステージのエール2枚をアーカイブして、アーカイブの〈虎金妃笑虎〉1枚を手札に戻しますか？'
      );
      if (!ok) return;

      // エール2枚を選んでアーカイブ（別々のホロメンからでも同じホロメンからでも可）
      const selected = yield ctx.chooseCards({
        cards: allCheers.map((p) => p.cheer),
        count: 2,
        title: 'アーカイブするエールを選択（2枚）',
      });
      if (selected.length < 2) return; // 選べなければコスト不成立（何もしない）
      for (const cheer of selected) {
        const entry = allCheers.find((p) => p.cheer === cheer);
        yield* ctx.archiveCheer(entry.holomem, cheer);
      }

      // アーカイブの〈虎金妃笑虎〉1枚を手札に戻す
      const ret = yield ctx.chooseCard({
        cards: ctx.player.archive.filter((c) => c.name === '虎金妃笑虎'),
        title: '手札に戻す〈虎金妃笑虎〉を選択',
      });
      if (!ret) return;
      ctx.removeFromArchive(ret);
      ctx.addToHand(ret, { reveal: true });
    },
  },
  arts: {
    '自分の人生すらも捧げられる': {
      *run(ctx) {
        if (ctx.player.cheerDeck.length === 0) return;
        // 自分の〈虎金妃笑虎〉に送れる（任意）
        const targets = ctx.holomems('self', (e) => e.top.name === '虎金妃笑虎');
        if (targets.length === 0) return;
        const ok = yield ctx.confirm('エールデッキの上から1枚を〈虎金妃笑虎〉に送りますか？');
        if (!ok) return;
        let target;
        if (targets.length === 1) {
          target = targets[0];
        } else {
          target = yield ctx.chooseHolomem({
            side: 'self',
            filter: (e) => e.top.name === '虎金妃笑虎',
            title: 'エールを送る〈虎金妃笑虎〉を選択',
          });
          if (!target) return;
        }
        ctx.sendCheerFromCheerDeckTop(target.holomem);
      },
    },
  },
};
