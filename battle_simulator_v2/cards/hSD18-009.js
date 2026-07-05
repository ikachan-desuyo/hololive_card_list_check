/**
 * 森カリオペ (hSD18-009) 紫・2nd・HP160（#EN #Myth #歌）
 * コラボエフェクト「ペイルライダー」:
 *   自分のアーカイブにホロメンが6枚以上あるなら、相手のセンターホロメンに特殊ダメージ20を与える。
 *   → アーカイブ内の kind==='holomen' を数え、6枚以上のとき相手センターへ特殊ダメージ20。
 *     「ライフは減らない」の記載は無いので通常どおり（noLifeOnDown は付けない）。
 * アーツ「刻むぞ冥界のビート」(90, 特攻 緑+30): テキスト効果なしのため定義不要。
 *
 * 保留: なし
 */
export default {
  number: 'hSD18-009',
  collabEffect: {
    name: 'ペイルライダー',
    *run(ctx) {
      const holomemCount = ctx.player.archive.filter((c) => c.kind === 'holomen').length;
      if (holomemCount < 6) return; // アーカイブのホロメンが6枚未満なら何もしない
      const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
      if (!center) return;
      yield* ctx.dealSpecialDamage(center, 20);
    },
  },
};
