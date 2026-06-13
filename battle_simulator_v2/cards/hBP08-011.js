/**
 * IRyS (hBP08-011) 白・1st・HP170（#EN #Promise #歌）
 * コラボエフェクト「The Hot Pink One」:
 *   このホロメンに白エールが付いているなら、自分のデッキを1枚引く。
 * アーツ「Hot Ending」(30):
 *   このホロメンに紫エールが付いているなら、自分のデッキを1枚引く。
 *   → アーツのダメージはエンジンが処理。run ではテキスト効果（条件付きドロー）のみ実装。
 * 保留: なし
 */
export default {
  number: 'hBP08-011',
  collabEffect: {
    name: 'The Hot Pink One',
    *run(ctx) {
      // このホロメンに白エールが付いているなら1枚引く
      if (ctx.sourceHolomem.cheers.some((c) => c.color === '白')) {
        ctx.draw(1);
      }
    },
  },
  arts: {
    'Hot Ending': {
      *run(ctx) {
        // このホロメンに紫エールが付いているなら1枚引く
        if (ctx.sourceHolomem.cheers.some((c) => c.color === '紫')) {
          ctx.draw(1);
        }
      },
    },
  },
};
