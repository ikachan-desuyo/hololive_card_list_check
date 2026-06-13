/**
 * ネリッサ・レイヴンクロフト (hBP02-068) 紫・2nd・HP210（#EN #Advent #歌 #トリ）
 * コラボエフェクト「音の魔人」:
 *   このターンの間、自分の#歌を持つ[センターホロメンとコラボホロメン]のアーツ+30。
 *   → センター/コラボに居て、かつ #歌 タグを持つホロメンへ artsPlus+30 のターン修正。
 *     対象は固定せず評価時に動的判定する（その時点でセンター/コラボに居る#歌ホロメン全員）。
 * アーツ「歌に宿りし愛情」(dmg80, 特攻 黄+50):
 *   テキスト効果なし（基礎ダメージ・特攻はエンジンがカードデータから処理）のため定義不要。
 */
export default {
  number: 'hBP02-068',
  collabEffect: {
    name: '音の魔人',
    *run(ctx) {
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 30,
        ownerIdx: ctx.playerIdx,
        match: (h) => {
          const zone = ctx.engine._zoneOf(h);
          if (zone !== 'center' && zone !== 'collab') return false;
          return (h.stack[0].tags || []).includes('歌');
        },
        description: 'このターン、自分の#歌を持つセンター/コラボホロメンのアーツ+30',
      });
    },
  },
};
