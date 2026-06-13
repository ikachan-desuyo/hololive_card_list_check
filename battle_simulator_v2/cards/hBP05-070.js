/**
 * 白上フブキ (hBP05-070) 黄・2nd・HP200（#1期生,#ゲーマーズ）
 * アーツ「フブキカフェにようこそ」(60): 自分のアーカイブの#白上'sキャラクターを持つ
 *   [マスコットとファン]を好きな枚数選び、自分のホロメンに割り振って付けられる。
 * アーツ「国王兼喫茶経営者」(100+): 自分の[推しホロメンが〈白上フブキ〉か推しホロメンの色が黄]で、
 *   自分のステージに[ツールとマスコットとファン]が合計4枚以上あるなら、このアーツ+100。
 */
const ATTACH_TYPES = ['ツール', 'マスコット', 'ファン'];

export default {
  number: 'hBP05-070',
  arts: {
    'フブキカフェにようこそ': {
      *run(ctx) {
        while (true) {
          const cand = ctx.player.archive.filter((c) =>
            c.kind === 'support' && ['マスコット', 'ファン'].includes(c.supportType) &&
            (c.tags || []).includes("白上'sキャラクター"));
          if (cand.length === 0) break;
          const picked = yield ctx.chooseCard({
            cards: cand, title: '付ける[マスコット/ファン]を選択（アーカイブ・任意）',
            optional: true, skipLabel: 'これ以上付けない',
          });
          if (!picked) break;
          // 付けられるホロメンに限定（ツール/マスコット上限・付け先ルールを尊重）
          const targets = ctx.holomems('self', (e) => ctx.engine._canAttachSupport(e.holomem, picked));
          if (targets.length === 0) break;
          const dest = yield ctx.chooseHolomem({
            side: 'self', filter: (e) => ctx.engine._canAttachSupport(e.holomem, picked),
            title: `${picked.name} を付けるホロメンを選択`,
          });
          if (!dest) break;
          ctx.removeFromArchive(picked);
          ctx.attachSupport(picked, dest.holomem);
        }
      },
    },
    '国王兼喫茶経営者': {
      dmgBonus(ctx) {
        const oshi = ctx.player.oshi;
        const oshiOk = oshi && (oshi.name === '白上フブキ' || oshi.color === '黄');
        if (!oshiOk) return 0;
        let count = 0;
        for (const e of ctx.holomems('self')) {
          count += e.holomem.attachments.filter((a) => ATTACH_TYPES.includes(a.supportType)).length;
        }
        return count >= 4 ? 100 : 0;
      },
    },
  },
};
