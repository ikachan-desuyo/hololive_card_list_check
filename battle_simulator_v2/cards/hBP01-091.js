/**
 * ムーナ・ホシノヴァ (hBP01-091) 青・1st・Buzzホロメン・HP240（#ID #ID1期生 #歌）
 * アーツ「月は夜に。」(50): 効果テキストなし（素点のみ）。
 * アーツ「ムーンナイトディーバ」(80):
 *   このホロメンの[緑エールか青エール]1枚をアーカイブできる：
 *   相手のバックホロメン1人に特殊ダメージ30を与える。
 *   → コスト（緑/青エール1枚アーカイブ）を支払える場合のみ、相手バック1人へ特殊ダメージ30。
 */
export default {
  number: 'hBP01-091',
  arts: {
    'ムーンナイトディーバ': {
      *run(ctx) {
        // コスト: このホロメンに付いている緑エールか青エール1枚をアーカイブ
        const src = ctx.sourceHolomem;
        if (!src) return;
        const payable = (src.cheers || []).filter((c) => c.color === '緑' || c.color === '青');
        if (payable.length === 0) return; // コストを払えない
        // 相手にバックホロメンがいなければ与え先がない
        const backs = ctx.holomems('opp', (e) => e.pos.zone === 'back');
        if (backs.length === 0) return;
        const ok = yield ctx.confirm('緑か青エール1枚をアーカイブして相手バックに特殊ダメージ30を与えますか？');
        if (!ok) return;
        const cheer = yield ctx.chooseCard({
          cards: payable,
          title: 'コスト: アーカイブする緑/青エールを選択',
        });
        if (!cheer) return;
        ctx.archiveCheer(src, cheer);
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.pos.zone === 'back',
          title: '特殊ダメージ30を与える相手バックホロメンを選択',
        });
        if (target) yield* ctx.dealSpecialDamage(target, 30);
      },
    },
  },
};
