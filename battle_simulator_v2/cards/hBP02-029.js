/**
 * 宝鐘マリン (hBP02-029) 赤・Debut・HP70（#JP #3期生 #絵 #海 #お酒）
 * コラボエフェクト「マリンと宅飲み」:
 *   相手のコラボホロメンに特殊ダメージ20を与える。
 * アーツ「マリン“船長”だろぉぉん！？」(30):
 *   追加テキスト効果なし（基本ダメージのみ）。エンジンが処理するため定義不要。
 *
 * コラボ枠は最大1人なので対象選択は不要。相手のコラボホロメンが居なければ何も起きない。
 */
export default {
  number: 'hBP02-029',

  collabEffect: {
    name: 'マリンと宅飲み',
    *run(ctx) {
      const collab = ctx.holomems('opp', (e) => e.pos.zone === 'collab')[0];
      if (!collab) {
        ctx.log('相手のコラボホロメンが居ないため特殊ダメージは発生しなかった');
        return;
      }
      yield* ctx.dealSpecialDamage(collab, 20);
    },
  },
};
