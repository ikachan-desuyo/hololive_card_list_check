/**
 * 鷹嶺ルイ (hBP01-057) 赤・Debut・HP60（#秘密結社holoX）
 * コラボエフェクト「アポイント」:
 *   相手のコラボホロメンに特殊ダメージ10を与える。
 * アーツ「漆黒の翼で誘おう」(20):
 *   相手のコラボホロメンに特殊ダメージ10を与える。
 *
 * いずれも対象は「相手のコラボホロメン」固定（コラボ枠は最大1人なので選択不要）。
 * コラボホロメンが居なければ何も起きない。
 */
function dealToOppCollab(ctx) {
  const collab = ctx.holomems('opp', (e) => e.pos.zone === 'collab')[0];
  if (!collab) {
    ctx.log('相手のコラボホロメンが居ないため特殊ダメージは発生しなかった');
    return;
  }
  ctx.dealSpecialDamage(collab, 10);
}

export default {
  number: 'hBP01-057',

  collabEffect: {
    name: 'アポイント',
    *run(ctx) {
      dealToOppCollab(ctx);
    },
  },

  arts: {
    '漆黒の翼で誘おう': {
      *run(ctx) {
        dealToOppCollab(ctx);
      },
    },
  },
};
