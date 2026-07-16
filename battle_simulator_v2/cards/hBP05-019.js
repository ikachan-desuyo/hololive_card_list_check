/**
 * アイラニ・イオフィフティーン (hBP05-019) 緑・Debut・HP90（#ID1期生）
 * コラボエフェクト「イオフィとおでかけ」(13.2):
 *   このホロメンのエール1枚をアーカイブできる：自分の#ID1期生を持つホロメン1人のHP30回復。
 *   → コラボした時に誘発。「できる」なのでコスト（エール1枚アーカイブ）は任意。
 * アーツ「君といる時間」(30): テキスト効果なし。
 */
export default {
  number: 'hBP05-019',
  collabEffect: {
    name: 'イオフィとおでかけ',
    *run(ctx) {
      const self = ctx.sourceHolomem;
      if (!self || self.cheers.length === 0) return;
      const cheer = yield ctx.chooseCard({
        cards: [...self.cheers],
        title: 'コスト: アーカイブするエールを選択（任意）',
        optional: true,
        skipLabel: 'アーカイブしない',
      });
      if (!cheer) return;
      yield* ctx.archiveCheer(self, cheer);
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.hasTag(e.top, 'ID1期生'),
        title: 'HP30回復する #ID1期生 のホロメンを選択',
      });
      if (target) ctx.heal(target.holomem, 30);
    },
  },
};
