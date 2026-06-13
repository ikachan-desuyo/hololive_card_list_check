/**
 * 姫森ルーナ 2nd (hBP03-014) 白・2nd・HP180（#JP #4期生 #ベイビー）
 * ブルームエフェクト「ルーナについてくるのら～」:
 *   自分の推しホロメンが〈姫森ルーナ〉の時、自分のアーカイブの〈ルーナイト〉1枚を
 *   自分の〈姫森ルーナ〉に付けられる。（「付けられる」=任意）
 * アーツ「お疲れ様なのらね」(100+):
 *   このホロメンに〈ルーナイト〉が付いている時、このアーツ+50。
 *   ※特攻[紫+50]はエンジン側で処理されるためここでは扱わない。
 */
export default {
  number: 'hBP03-014',
  bloomEffect: {
    name: 'ルーナについてくるのら～',
    *run(ctx) {
      // 条件: 自分の推しホロメンが〈姫森ルーナ〉
      if (ctx.player.oshi?.name !== '姫森ルーナ') return;
      // アーカイブの〈ルーナイト〉
      const lunaights = ctx.player.archive.filter((c) => c.name === 'ルーナイト');
      if (lunaights.length === 0) return;
      // 付け先の〈姫森ルーナ〉（ステージ上のホロメンで名前が一致するもの）
      const targets = ctx.holomems('self', (e) => e.top.name === '姫森ルーナ');
      if (targets.length === 0) return;

      const card = yield ctx.chooseCard({
        cards: lunaights,
        title: '自分の〈姫森ルーナ〉に付ける〈ルーナイト〉を選択（任意）',
        optional: true,
        skipLabel: '付けない',
      });
      if (!card) return;

      let dest;
      if (targets.length === 1) {
        dest = targets[0];
      } else {
        dest = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => e.top.name === '姫森ルーナ',
          title: '〈ルーナイト〉を付ける〈姫森ルーナ〉を選択',
        });
      }
      if (!dest) return;

      ctx.removeFromArchive(card);
      yield* ctx.attachSupportWithTrigger(card, dest.holomem);
    },
  },
  arts: {
    'お疲れ様なのらね': {
      dmgBonus(ctx) {
        const hasLunaight = ctx.sourceHolomem?.attachments?.some((a) => a.name === 'ルーナイト');
        return hasLunaight ? 50 : 0;
      },
    },
  },
};
