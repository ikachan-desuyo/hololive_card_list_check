/**
 * まつたけダンス (hSD15-010) サポート・イベント
 *
 * [サポート効果] 自分のステージの〈儒烏風亭らでん〉1人を選ぶ。
 *   このターンの間、選んだホロメンのアーツ+10。
 *   そのホロメンに、エールが3枚以上付いているなら、かわりに、そのホロメンのアーツ+20。
 *
 * 実装方針:
 *   - 使用条件 canUse: 自分のステージに〈儒烏風亭らでん〉が1人以上いること。
 *   - 対象選択: 自分のステージの〈儒烏風亭らでん〉1人。
 *   - 「エールが3枚以上付いているなら、かわりに+20」= 選択後にそのホロメンの cheers.length>=3 を判定し、
 *     3枚以上なら+20、そうでなければ+10（排他。両方は乗らない）。
 *   - addTurnModifier(kind:'artsPlus', match: 対象ホロメン同一性) でこのターンのみ付与。
 *
 * 保留: なし
 */
export default {
  number: 'hSD15-010',
  support: {
    canUse(ctx) {
      return ctx.holomems('self', (e) => ctx.nameIs(e.top, '儒烏風亭らでん')).length > 0;
    },
    *run(ctx) {
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.nameIs(e.top, '儒烏風亭らでん'),
        title: 'アーツを上げる〈儒烏風亭らでん〉を選択',
      });
      if (!target) return;
      const chosen = target.holomem;

      // エールが3枚以上付いているなら、かわりに+20（排他）。そうでなければ+10。
      const amount = chosen.cheers.length >= 3 ? 20 : 10;
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount,
        ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターン、${chosen.stack[0].name} のアーツ+${amount}` +
          `（エール${chosen.cheers.length}枚）`,
      });
    },
  },
};
