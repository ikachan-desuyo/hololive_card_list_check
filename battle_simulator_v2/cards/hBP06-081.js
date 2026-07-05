/**
 * 大空スバル 2nd (hBP06-081) 黄・2nd・HP200（#JP #2期生 #トリ）
 *
 * ブルームエフェクト「出動！ ドタバタ大空警察!!」:
 *   自分の推しホロメンが〈大空スバル〉なら、自分のステージのエール1枚をアーカイブできる：
 *   自分のデッキから〈大空スバル〉1枚を公開し手札に加える。そしてデッキをシャッフルする。
 *
 * アーツ「GUILTY or INNOCENT」(100, 特攻: 赤+50):
 *   自分のライフが3以下なら、このホロメンのエール1枚につき、
 *   自分のエールデッキの上から1枚を自分の黄ホロメン1人に送れる。
 *   （「1枚につき」=このホロメンに付いているエール枚数だけ繰り返す。「送れる」=各回任意）
 */
export default {
  number: 'hBP06-081',
  bloomEffect: {
    name: '出動！ ドタバタ大空警察!!',
    *run(ctx) {
      // 推しホロメンが〈大空スバル〉でなければ発動できない
      if (ctx.player.oshi?.name !== '大空スバル') return;
      // コスト: 自分のステージのエール1枚をアーカイブ（できる＝任意）
      const cheerHolders = ctx.holomems('self', (e) => e.holomem.cheers.length > 0);
      if (cheerHolders.length === 0) return;
      const ok = yield ctx.confirm('ステージのエール1枚をアーカイブして〈大空スバル〉をサーチしますか？');
      if (!ok) return;
      const holder = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.holomem.cheers.length > 0,
        title: 'アーカイブするエールが付いているホロメンを選択',
      });
      if (!holder) return;
      const cheer = yield ctx.chooseCard({
        cards: holder.holomem.cheers,
        title: 'アーカイブするエールを選択',
      });
      if (!cheer) return;
      yield* ctx.archiveCheer(holder.holomem, cheer);
      // 効果: デッキから〈大空スバル〉1枚を公開し手札に加える
      const targets = ctx.deckCards((c) => c.name === '大空スバル');
      if (targets.length > 0) {
        const picked = yield ctx.chooseCard({
          cards: targets,
          title: '手札に加える〈大空スバル〉を選択',
          optional: true,
        });
        if (picked) {
          ctx.removeFromDeck(picked);
          ctx.addToHand(picked, { reveal: true });
        }
      }
      // そしてデッキをシャッフルする（公開・サーチ後は必ずシャッフル）
      ctx.shuffleDeck();
    },
  },
  arts: {
    'GUILTY or INNOCENT': {
      *run(ctx) {
        // 自分のライフが3以下なら
        if (ctx.player.life.length > 3) return;
        // このホロメンのエール1枚につき1回
        const n = ctx.sourceHolomem.cheers.length;
        for (let i = 0; i < n; i++) {
          if (ctx.player.cheerDeck.length === 0) break;
          // 送れる＝任意。送り先は自分の黄ホロメン1人
          const target = yield ctx.chooseHolomem({
            side: 'self',
            filter: (e) => e.top.color === '黄',
            title: `エールデッキの上から1枚を黄ホロメンに送る（残り${n - i}回・送らないも可）`,
            optional: true,
          });
          if (!target) break;
          ctx.sendCheerFromCheerDeckTop(target.holomem);
        }
      },
    },
  },
};
