/**
 * うまみー！ (hBP07-093) サポート・イベント
 *
 * [サポート効果] 自分のコラボポジションの〈ベスティア・ゼータ〉を選ぶ。
 *   このターンの間、選んだホロメンのアーツ+40。その後、サイコロを1回振る。
 *   6以外なら、このカードをデッキに戻してシャッフルする。
 *   自分の〈うまみー！〉はターンに1回しか使えない。
 *
 * 実装方針:
 *   - 対象は「コラボポジションの〈ベスティア・ゼータ〉」（名前一致）。居なければ使えない。
 *   - addTurnModifier({kind:'artsPlus'}) でこのターン +40。
 *   - 「ターンに1回しか使えない」は LIMITED ではなく名称ごとの制限なので、
 *     canUse で supportsPlayedThisTurn 内の同名カードの有無を見て制限する。
 *
 *   「6以外なら、このカードをデッキに戻してシャッフルする」:
 *   → ctx.markReturnSelfToDeck() で実装。engine のサポート解決後処理がこのフラグを見て、
 *     archive のかわりにデッキへ戻して最後にシャッフルする（保存則は engine 側で担保）。
 */
export default {
  number: 'hBP07-093',
  support: {
    canUse(ctx) {
      // ターンに1回制限（同名サポートを既にこのターン使っていたら不可）
      if (ctx.countSupportThisTurn((c) => c.name === 'うまみー！') > 0) return false;
      // コラボポジションの〈ベスティア・ゼータ〉が必要
      return ctx.holomems('self', (e) =>
        e.pos.zone === 'collab' && e.top.name === 'ベスティア・ゼータ').length > 0;
    },
    *run(ctx) {
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.pos.zone === 'collab' && e.top.name === 'ベスティア・ゼータ',
        title: 'このターン アーツ+40 する コラボの〈ベスティア・ゼータ〉を選択',
      });
      if (!target) return;
      const chosen = target.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus', amount: 40, ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターン、${chosen.stack[0].name} のアーツ+40`,
      });
      // サイコロを振る（6以外なら markReturnSelfToDeck でデッキに戻す）
      const roll = (yield* ctx.rollDice());
      if (roll !== 6) {
        ctx.markReturnSelfToDeck(); // 6以外: このカードをアーカイブせずデッキに戻してシャッフル（engine が解決後に処理）
        ctx.log('うまみー！: 6以外のため、このカードをデッキに戻してシャッフルする');
      }
    },
  },
};
