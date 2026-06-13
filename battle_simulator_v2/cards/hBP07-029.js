/**
 * 大神ミオ (hBP07-029) 緑・2nd・HP200（#JP #ゲーマーズ #ケモミミ #料理）
 *
 * [キーワード/ギフト]「緑の地母神」:
 *   [ターンに1回]相手のターンで、このホロメンがダメージを受けた時、
 *   このホロメンにサポートカードが付いているなら、このホロメンのHP50回復。
 *   → 未実装（保留）。エンジンに「ダメージを受けた時」のトリガーフック
 *     （被ダメージ割り込み系）が存在しないため実装できない。
 *     triggers には onDown / onAttach / onOpponentDown しか無く、
 *     「受けた時」を捕捉する手段が無い。
 *
 * [アーツ]「Upright Leading」(130+ / 特攻 黄+50):
 *   自分のデッキの上から1枚をアーカイブできる。
 *   アーカイブしたカードがホロメンなら、自分のエールデッキの上から1枚を自分のホロメンに送る。
 *   サポートカードなら、このアーツ+50。
 *   → 実装済み。
 */
export default {
  number: 'hBP07-029',
  arts: {
    'Upright Leading': {
      *run(ctx) {
        if (ctx.player.deck.length === 0) return;
        const ok = yield ctx.confirm('デッキの上から1枚をアーカイブしますか？');
        if (!ok) return;
        const card = ctx.player.deck.shift();
        ctx.player.archive.push(card);
        ctx.log(`${ctx.player.name}: デッキの上の ${card.name} をアーカイブ`);
        ctx.flashReveal(card); // 何をアーカイブしたか画面に見せる
        if (card.kind === 'holomen') {
          // ホロメンなら、エールデッキの上から1枚を自分のホロメンに送る
          const target = yield ctx.chooseHolomem({
            side: 'self',
            title: 'エールを送る自分のホロメンを選択',
          });
          if (target) ctx.sendCheerFromCheerDeckTop(target.holomem);
        } else if (card.kind === 'support') {
          // サポートカードなら、このアーツ+50
          ctx.addArtBonus(50, 'アーカイブしたカードがサポート');
        }
        // それ以外（エール）は追加効果なし
      },
    },
  },
};
