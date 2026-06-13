/**
 * こぼ・かなえる (hBP01-086) 青・1st・HP110（#ID #ID3期生）
 *
 * ブルームエフェクト「バーチャルマーケティング」:
 *   自分の#IDを持つホロメンのエール1枚をアーカイブできる：
 *   相手のバックホロメン全員に特殊ダメージ10を与える（ダウンしても相手のライフは減らない）。
 *   → コスト（エールのアーカイブ）は「できる」=任意。支払わなければ効果は発生しない。
 *
 * アーツ「OnAeru」(40) はテキスト効果のないバニラアーツのため実装不要。
 */
export default {
  number: 'hBP01-086',
  bloomEffect: {
    name: 'バーチャルマーケティング',
    *run(ctx) {
      // 自分の#IDを持つホロメンのうち、エールが付いている対象を集める
      const idHolomems = ctx.holomems('self', (e) =>
        ctx.hasTag(e.top, 'ID') && (e.holomem.cheers || []).length > 0);
      if (idHolomems.length === 0) return; // コストを支払えない
      const ok = yield ctx.confirm(
        '自分の#IDホロメンのエール1枚をアーカイブして、相手のバックホロメン全員に特殊ダメージ10を与えますか？'
      );
      if (!ok) return;
      // どのホロメンのエールをアーカイブするか選ぶ（#IDホロメンが複数いる場合）
      let holomem;
      if (idHolomems.length === 1) {
        holomem = idHolomems[0].holomem;
      } else {
        const targetEntry = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => ctx.hasTag(e.top, 'ID') && (e.holomem.cheers || []).length > 0,
          title: 'エールをアーカイブする#IDホロメンを選択',
        });
        if (!targetEntry) return;
        holomem = targetEntry.holomem;
      }
      const picked = yield ctx.chooseCard({
        cards: [...holomem.cheers],
        title: 'アーカイブするエールを選択',
      });
      if (!picked) return; // 支払えなければ効果は発生しない
      yield* ctx.archiveCheer(holomem, picked);
      const backs = ctx.holomems('opponent', (e) => e.pos.zone === 'back');
      for (const e of backs) {
        yield* ctx.dealSpecialDamage(e, 10, { noLifeOnDown: true });
      }
    },
  },
};
