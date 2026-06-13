/**
 * アイラニ・イオフィフティーン (hBP05-019) 緑・Debut・HP90（#ID1期生）
 * キーワード「イオフィとおでかけ」:
 *   このホロメンのエール1枚をアーカイブできる：自分の#ID1期生を持つホロメン1人のHP30回復。
 *   → メインステップの起動型能力（コスト: 自分のエール1枚アーカイブ）
 * アーツ「君といる時間」(30): テキスト効果なし。
 */
export default {
  number: 'hBP05-019',
  activatedAbilities: [{
    name: 'イオフィとおでかけ',
    oncePerTurn: false, // ターン制限の記載なし
    canUse(ctx) {
      if (ctx.sourceHolomem.cheers.length < 1) return false;
      // HPが減っている #ID1期生 がいる時に意味がある
      return ctx.holomems('self', (e) => ctx.hasTag(e.top, 'ID1期生') && e.holomem.damage > 0).length > 0;
    },
    *run(ctx) {
      const cheer = yield ctx.chooseCard({
        cards: [...ctx.sourceHolomem.cheers],
        title: 'コスト: アーカイブするエールを選択',
      });
      if (!cheer) return;
      yield* ctx.archiveCheer(ctx.sourceHolomem, cheer);
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.hasTag(e.top, 'ID1期生'),
        title: 'HP30回復する #ID1期生 のホロメンを選択',
      });
      if (target) ctx.heal(target.holomem, 30);
    },
  }],
};
