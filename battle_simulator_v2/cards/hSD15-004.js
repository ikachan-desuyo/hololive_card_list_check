/**
 * 儒烏風亭らでん (hSD15-004) 緑・Debut・HP90（#DEV_IS #ReGLOSS #お酒）
 * コラボエフェクト「一服朝っぱらでん」:
 *   自分が後攻で最初のターンなら、自分のエールデッキの上から1枚を自分のバックホロメンに送る。
 *
 * 解釈:
 *  - 後攻かつ自分の最初のターンでなければ何もしない（ctx.isFirstTurnGoingSecond）。
 *  - 「自分のバックホロメンに送る」=送り先はバックのホロメンのみ。バックが居なければ何もしない。
 *  - 「送る」は必須効果だが、送り先のバックホロメンが居ない／エールデッキが空なら不発（安全側）。
 *
 * アーツ「散歩でもいかがですかな？」(20): テキスト効果なし（エンジンが素点処理）。
 * 保留: なし
 */
export default {
  number: 'hSD15-004',
  collabEffect: {
    name: '一服朝っぱらでん',
    *run(ctx) {
      if (!ctx.isFirstTurnGoingSecond()) return;
      const backs = ctx.holomems('self', (e) => e.pos.zone === 'back');
      if (backs.length === 0) return;
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.pos.zone === 'back',
        title: 'エールデッキの上から1枚を送るバックホロメンを選択',
      });
      if (entry) ctx.sendCheerFromCheerDeckTop(entry.holomem);
    },
  },
};
