/**
 * 白上フブキ (hSD14-007) 白・ホロメン・1st・HP130（#JP #1期生 #ゲーマーズ #ケモミミ #絵）
 * バトンタッチ: 無色
 *
 * [ブルームエフェクト] Message for You -フブキ-:
 *   自分のセンターホロメンを選ぶ。このターンの間、選んだホロメンのアーツ+10。
 *   → bloomEffect。対象は「自分のセンターホロメン」のみ（センター1人＝実質固定だが
 *     テキストどおり選択として提示する）。センターが居なければ対象不在で何もしない。
 *     kind:'artsPlus' のターン修正（match で選んだホロメンに限定）を付与する。
 *     エンジンの system.js artsBonus がこの修正を読み、アーツのダメージに +10 する。
 *
 * [アーツ] あーまいーこのきーもちー (dmg:20 / any):
 *   テキスト効果なし（コストのみ）。素点20はエンジンが処理するため実装不要。
 *
 * 保留: なし（ブルームエフェクト実装済み。アーツは素点のみで効果テキスト無し）。
 */
export default {
  number: 'hSD14-007',

  bloomEffect: {
    name: 'Message for You -フブキ-',
    *run(ctx) {
      // 対象は自分のセンターホロメンのみ
      const candidates = ctx.holomems('self', (e) => e.pos.zone === 'center');
      if (candidates.length === 0) {
        ctx.log('Message for You -フブキ-: 自分のセンターホロメンがいないため発動しない');
        return;
      }
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.pos.zone === 'center',
        title: 'アーツ+10するセンターホロメンを選択',
      });
      if (!entry) return;
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 10,
        ownerIdx: ctx.playerIdx,
        match: (h) => h === entry.holomem,
        description: `このターンの間、${entry.top.name} のアーツ+10`,
      });
    },
  },
};
