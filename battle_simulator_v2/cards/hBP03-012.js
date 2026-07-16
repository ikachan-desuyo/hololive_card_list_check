/**
 * 姫森ルーナ (hBP03-012) 白・1st・HP120（#JP #4期生 #ベイビー）
 * ブルームエフェクト「一緒に最高のライブにしようね」:
 *   このターンの間、自分のファンが付いているホロメン1人のアーツ+20。
 *   → ファンが付いている自分のホロメン1人を選び、このターン そのホロメンのアーツ+20。
 *     「できる」の記載なし＝対象がいれば強制（選択のスキップ不可）。
 * アーツ「約束なのら！」(40): テキスト効果なし。
 */
export default {
  number: 'hBP03-012',
  bloomEffect: {
    name: '一緒に最高のライブにしようね',
    *run(ctx) {
      // ファンが付いている自分のホロメンが対象（「できる」の記載なし＝対象がいれば強制）
      const hasFan = (e) => e.holomem.attachments.some((a) => a.supportType === 'ファン');
      if (ctx.holomems('self', hasFan).length === 0) return; // 対象不在なら何もしない
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: hasFan,
        title: 'このターン アーツ+20する「ファンが付いているホロメン」を選択',
      });
      if (!target) return;
      const chosen = target.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus', amount: 20, ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターン、${chosen.stack[0].name} のアーツ+20`,
      });
    },
  },
};
