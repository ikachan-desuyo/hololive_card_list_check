/**
 * ときのそら (hSD01-004) 白・Debut・HP50（#JP #0期生 #歌）
 *
 * コラボエフェクト「レッツダンス！」:
 *   このターンの間、自分のセンターホロメンのアーツ+20。
 *   → 効果解決時のセンターホロメンに対し、このターンの artsPlus+20 を付与する。
 *
 * アーツ「オンステージ！」(dmg:20):
 *   テキスト効果なし（素点20のみ）。run不要。
 */
export default {
  number: 'hSD01-004',
  collabEffect: {
    name: 'レッツダンス！',
    *run(ctx) {
      const center = ctx.holomems('self', (e) => e.pos.zone === 'center')[0];
      if (!center) return;
      const target = center.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 20,
        ownerIdx: ctx.playerIdx,
        match: (h) => h === target,
        description: 'このターン、センターホロメンのアーツ+20（レッツダンス！）',
      });
    },
  },
  arts: {
    'オンステージ！': {
      // テキスト効果なし
    },
  },
};
