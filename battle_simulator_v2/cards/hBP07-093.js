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
 * 【未実装・エンジン制約】
 *   「6以外なら、このカードをデッキに戻してシャッフルする」は実装できていない。
 *   v2エンジンはサポートカードを効果解決後に無条件でアーカイブへ送る仕様で
 *   （engine.js のサポート処理: 解決領域→archive.push）、解決中にカード自身を
 *   デッキへ戻すフックが無い。無理に revealed から抜くと finish 時の
 *   archive.push と二重所属になり保存則が壊れる。
 *   そのためサイコロは振ってログには出すが（演出・公開情報の整合のため）、
 *   結果に関わらずカードは常にアーカイブへ送られる（=6が出た時の挙動のみ正しい）。
 *   サポートの「使用後デッキに戻す」機構が入ったら roll!==6 の分岐で実装すること。
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
      // サイコロを振る（6以外ならデッキに戻す処理は未実装。上部JSDoc参照）
      const roll = (yield* ctx.rollDice());
      if (roll !== 6) {
        ctx.log('TODO(効果未実装): 6以外のため本来このカードをデッキに戻してシャッフルするが、エンジン制約によりアーカイブへ送られる');
      }
    },
  },
};
