/**
 * 獅白ぼたん 2nd (hBP03-021) 緑・2nd・HP190（#JP #5期生 #ケモミミ #シューター）
 * ブルームエフェクト「なんとかしてくれる獅白ぼたん」:
 *   自分のアーカイブの緑エール1枚ずつを、自分の#シューターを持つバックホロメン1～2人に送れる。
 *   → 「送れる」=任意。「1～2人」=別々のバックホロメン1人または2人。「1枚ずつ」=各ホロメンへ緑エール1枚。
 * アーツ「神エイム」(110):
 *   自分の推しホロメンが〈獅白ぼたん〉の時、自分のバックホロメンのエール1枚をアーカイブできる：
 *   相手のセンターホロメンかコラボホロメンに特殊ダメージ40を与える。
 *   → 推し名が〈獅白ぼたん〉であることがコスト支払いの前提条件。
 */
export default {
  number: 'hBP03-021',
  bloomEffect: {
    name: 'なんとかしてくれる獅白ぼたん',
    *run(ctx) {
      // #シューターを持つ自分のバックホロメン
      const shooterBacksFilter = (e) => e.pos.zone === 'back' && ctx.hasTag(e.top, 'シューター');
      // アーカイブに緑エールが無ければ何もしない
      if (ctx.player.archive.filter((c) => c.kind === 'cheer' && c.color === '緑').length === 0) return;
      if (ctx.holomems('self', shooterBacksFilter).length === 0) return;

      // 1～2人に、それぞれ別々に緑エール1枚を送る（各回ごとに対象選択 → エール選択）
      const chosen = new Set(); // 既に送ったバックホロメン（同じホロメンに2枚目を送らない）
      for (let i = 0; i < 2; i++) {
        const greenCheers = ctx.player.archive.filter((c) => c.kind === 'cheer' && c.color === '緑');
        if (greenCheers.length === 0) break;
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => shooterBacksFilter(e) && !chosen.has(e.holomem),
          title: `緑エールを送る#シューターのバックホロメンを選択（${i + 1}人目・任意）`,
          optional: true,
        });
        if (!target) break;
        const cheer = yield ctx.chooseCard({
          cards: greenCheers,
          title: 'アーカイブから送る緑エールを選択',
        });
        if (!cheer) break;
        ctx.removeFromArchive(cheer);
        ctx.attachCheer(cheer, target.holomem);
        chosen.add(target.holomem);
      }
    },
  },
  arts: {
    '神エイム': {
      *run(ctx) {
        // 条件: 自分の推しホロメンが〈獅白ぼたん〉
        if (ctx.player.oshi?.name !== '獅白ぼたん') return;
        // コスト対象: エールを持つ自分のバックホロメン
        const backsWithCheer = ctx.holomems('self', (e) => e.pos.zone === 'back' && e.holomem.cheers.length > 0);
        if (backsWithCheer.length === 0) return;
        const ok = yield ctx.confirm('バックホロメンのエール1枚をアーカイブして相手に特殊ダメージ40を与えますか？');
        if (!ok) return;
        const backSel = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => e.pos.zone === 'back' && e.holomem.cheers.length > 0,
          title: 'エールをアーカイブするバックホロメンを選択',
        });
        if (!backSel) return;
        const cheer = yield ctx.chooseCard({
          cards: backSel.holomem.cheers,
          title: 'アーカイブするエールを選択',
        });
        if (!cheer) return;
        ctx.archiveCheer(backSel.holomem, cheer);
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'collab',
          title: '特殊ダメージ40を与える相手ホロメンを選択（センターかコラボ）',
        });
        if (target) yield* ctx.dealSpecialDamage(target, 40);
      },
    },
  },
};
