/**
 * 癒月ちょこ (hBP05-052) 紫・Debut・HP90（#料理）
 * コラボエフェクト「秘密の保健室」:
 *   自分のアーカイブにイベントがあるなら、相手のセンターホロメンに特殊ダメージ10を与える。
 * アーツ「膝枕とかどうですか？」(30): テキスト効果なし。
 */
export default {
  number: 'hBP05-052',
  collabEffect: {
    name: '秘密の保健室',
    *run(ctx) {
      const hasEvent = ctx.player.archive.some((c) => c.kind === 'support' && c.supportType === 'イベント');
      if (!hasEvent) return;
      const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
      if (center) yield* ctx.dealSpecialDamage(center, 10);
    },
  },
};
