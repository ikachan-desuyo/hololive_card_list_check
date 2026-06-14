/**
 * 赤井はあと (hBP07-042) 赤・2nd・HP200（#JP #1期生 #料理）
 * アーツ「純心タランテラ」(80 / 赤赤 / 特攻 紫+50):
 *   相手のセンターホロメンとコラボホロメンに特殊ダメージ40を与える。
 * アーツ「幸せへの旅路」(140+ / 赤無無 / 特攻 紫+50):
 *   このターンに自分のホロメンがステージからデッキに戻っていたなら、このアーツ+50。
 *
 *   「幸せへの旅路」の +50 条件「このターンに自分のホロメンがステージからデッキに戻っていたなら」は
 *   engine が p.holomemReturnedToDeckThisTurn（returnHolomemToDeck で設定・ターン開始でリセット）を
 *   保持するので、dmgBonus で参照する。
 */
export default {
  number: 'hBP07-042',
  arts: {
    '純心タランテラ': {
      *run(ctx) {
        for (const entry of ctx.holomems('opp', (e) => e.pos.zone === 'center' || e.pos.zone === 'collab')) {
          yield* ctx.dealSpecialDamage(entry, 40);
        }
      },
    },
    '幸せへの旅路': {
      // このターンに自分のホロメンがステージからデッキに戻っていたなら +50
      dmgBonus(ctx) {
        return ctx.player.holomemReturnedToDeckThisTurn ? 50 : 0;
      },
    },
  },
};
