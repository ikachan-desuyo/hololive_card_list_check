/**
 * 桃鈴ねね (hBP04-086) 黄
 * アーツ「ギラギラパワー」(50+):
 *   自分のアーカイブのエール1枚につき、このアーツ+20。ただし、数える枚数は5枚まで。
 * （アーツ「ハズバンドいっぱい」はテキスト効果なし＝エンジンが基本値を処理）
 */
export default {
  number: 'hBP04-086',
  arts: {
    'ギラギラパワー': {
      dmgBonus(ctx) {
        const n = ctx.player.archive.filter((c) => c.kind === 'cheer').length;
        return Math.min(n, 5) * 20;
      },
    },
  },
};
