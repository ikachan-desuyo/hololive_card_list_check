/**
 * シオリ・ノヴェラ (hSD12-003) 青・Debut・HP130（#EN #Advent）
 * コラボエフェクト「パレ・モンローズのお話をお聞きになったことは？」:
 *   相手のバックホロメン1人に特殊ダメージ10を与える。
 * アーツ「アデュー、親愛なる聞き手様」(任意エール1, dmg20):
 *   追加効果なし（素のアーツのため定義不要）。
 */
export default {
  number: 'hSD12-003',
  collabEffect: {
    name: 'パレ・モンローズのお話をお聞きになったことは？',
    *run(ctx) {
      const backs = ctx.holomems('opp', (e) => e.pos.zone === 'back');
      if (backs.length === 0) return;
      const target = yield ctx.chooseHolomem({
        side: 'opp',
        filter: (e) => e.pos.zone === 'back',
        title: '特殊ダメージ10を与える相手のバックホロメンを選択',
      });
      if (target) ctx.dealSpecialDamage(target, 10);
    },
  },
};
