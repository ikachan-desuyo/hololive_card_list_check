/**
 * パヴォリア・レイネ 2nd (hBP08-032) 緑・ホロメン・HP180（#ID #ID2期生 #トリ #絵）
 *
 * ブルームエフェクト「新しい旅へ」:
 *   自分のステージの2ndホロメンの[〈クレイジー・オリー〉か〈アーニャ・メルフィッサ〉]1人を選ぶ。
 *   このターンの間、選んだホロメンのアーツ+70。
 *   → bloomEffect.run: side='self' の 2nd ホロメンのうち名前が
 *     クレイジー・オリー / アーニャ・メルフィッサ のものを選び、artsPlus のターン修正を付与。
 *     候補が無ければ何もしない（強制選択だが対象0なら選べない）。
 *
 * アーツ「ストラクチュラル・カラー」(80+):
 *   自分の〈パヴォリア・レイネ〉以外の#ID2期生を持つホロメンに紫エールか黄エールが付いているなら、このアーツ+70。
 *   → dmgBonus(ctx): 自分のステージの、名前が「パヴォリア・レイネ」でない #ID2期生 ホロメンの
 *     いずれかに紫または黄のエールが付いていれば +70、無ければ 0。
 *     ※「〈パヴォリア・レイネ〉以外」は名前での除外（同名の別レイネも対象外）。sourceHolomem だけの除外ではない。
 *     特攻「青+50」(icons.tokkou) はエンジンが基本ダメージ計算で処理するため dmgBonus には書かない。
 *
 * 保留: なし（ブルームエフェクト・アーツとも全文実装）。
 */
export default {
  number: 'hBP08-032',

  bloomEffect: {
    name: '新しい旅へ',
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) =>
          e.top.bloomLevel === '2nd' &&
          (e.top.name === 'クレイジー・オリー' || e.top.name === 'アーニャ・メルフィッサ'),
        title: 'このターン アーツ+70する2ndホロメン（クレイジー・オリー / アーニャ・メルフィッサ）を選択',
      });
      if (!entry) return;
      const chosen = entry.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus', amount: 70, ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターンの間、${chosen.stack[0].name} のアーツ+70`,
      });
    },
  },

  arts: {
    'ストラクチュラル・カラー': {
      // 自分の「パヴォリア・レイネ」以外の #ID2期生 ホロメンに紫か黄のエールが付いていれば +70
      dmgBonus(ctx) {
        const hit = ctx.holomems('self', ({ top }) =>
          top.name !== 'パヴォリア・レイネ' && ctx.hasTag(top, 'ID2期生'))
          .some(({ holomem }) =>
            (holomem.cheers || []).some((c) => c.color === '紫' || c.color === '黄'));
        return hit ? 70 : 0;
      },
    },
  },
};
