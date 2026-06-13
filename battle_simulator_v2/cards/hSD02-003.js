/**
 * 百鬼あやめ (hSD02-003) 赤・Debut・HP70（#JP #2期生 #シューター）
 * コラボエフェクト「業」:
 *   相手のコラボホロメンに特殊ダメージ10を与える。
 *   （コラボ枠は最大1人なので選択不要。居なければ何も起きない。）
 * アーツ「不知火」(any) dmg:30 — テキスト効果なし（素のダメージのみ）。
 */
export default {
  number: 'hSD02-003',

  collabEffect: {
    name: '業',
    *run(ctx) {
      const collab = ctx.holomems('opp', (e) => e.pos.zone === 'collab')[0];
      if (!collab) {
        ctx.log('相手のコラボホロメンが居ないため特殊ダメージは発生しなかった');
        return;
      }
      ctx.dealSpecialDamage(collab, 10);
    },
  },
};
