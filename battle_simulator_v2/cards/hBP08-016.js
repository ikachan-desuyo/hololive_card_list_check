/**
 * ときのそら (hBP08-016) ホロメン・白・1st・HP180（#JP #0期生 #歌）
 *
 * [アーツ] Stairway to the Stars（30 / any）:
 *   自分のステージに〈ときのそら〉が3人以上いるなら、自分のデッキを1枚引く。
 *   → 名称参照〈ときのそら〉は top.name === 'ときのそら' で判定（自分のステージのホロメン数）。
 *      3人以上なら ctx.draw(1)。アーツの素点ダメージはエンジンが処理。
 *
 * [アーツ] あの時の空へ…（90 / white,any,any）: テキスト効果なし（素点ダメージのみ）。
 *
 * 保留: なし。
 */
export default {
  number: 'hBP08-016',

  arts: {
    'Stairway to the Stars': {
      *run(ctx) {
        // 自分のステージに〈ときのそら〉が3人以上いるなら1枚引く
        const soraCount = ctx.holomems('self',
          ({ top }) => ctx.nameIs(top, 'ときのそら')).length;
        if (soraCount >= 3) {
          ctx.draw(1);
        }
      },
    },
  },
};
