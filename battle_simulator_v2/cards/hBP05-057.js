/**
 * ネリッサ・レイヴンクロフト (hBP05-057) 紫・Debut・HP80（#EN #Advent #歌 #トリ）
 *
 * コラボエフェクト「Going out!」:
 *   このターンの間、自分のステージの#歌を持つホロメン1人のアーツ+10。
 *   → #歌を持つ自分のステージのホロメン1人を選び、そのホロメンに artsPlus+10 の
 *     ターン修正を付与する（match は選んだホロメン本体に限定。ターン終了で自動消滅）。
 *     候補がいなければ何もしない。
 *
 * アーツ「Cool Summer Nights」(20):
 *   追加効果なし（素のダメージのみ）のため定義不要。
 *
 * 保留: なし
 */
export default {
  number: 'hBP05-057',
  collabEffect: {
    name: 'Going out!',
    *run(ctx) {
      // 自分のステージの#歌を持つホロメン1人を選ぶ
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.hasTag(e.top, '歌'),
        title: 'アーツ+10する #歌 を持つホロメンを選択',
      });
      if (!target) return; // 対象がいない
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 10,
        ownerIdx: ctx.playerIdx,
        // 選んだホロメン1人に限定
        match: (h) => h === target.holomem,
        description: `このターンの間、${target.top.name} のアーツ+10`,
      });
    },
  },
};
