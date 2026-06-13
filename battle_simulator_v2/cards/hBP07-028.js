/**
 * 大神ミオ (hBP07-028) 緑・2nd・HP200（#JP #ゲーマーズ #ケモミミ #料理）
 * コラボエフェクト「金瞳の綺羅星」:
 *   自分のデッキの上から2枚を見る。その中からカード1枚を手札に加える。残ったカードをデッキの上に戻す。
 * アーツ「天まで届け、みんなの願い」(90+):
 *   自分のデッキの上から1枚をアーカイブできる。アーカイブしたカードがサポートカードなら、このアーツ+50。
 */
export default {
  number: 'hBP07-028',
  collabEffect: {
    name: '金瞳の綺羅星',
    *run(ctx) {
      const looked = ctx.lookTopDeck(2);
      if (looked.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: [...looked],
        title: '手札に加えるカードを選択',
      });
      if (picked) {
        // 解決領域(revealed)から取り除いて手札へ
        ctx.addToHand(picked);
        const rest = looked.filter((c) => c !== picked);
        ctx.deckToTop(rest); // 残りをデッキの上に戻す
      } else {
        // 選ばなかった場合（candが空でない限り基本選ぶが、念のため）は全てデッキの上に戻す
        ctx.deckToTop(looked);
      }
    },
  },
  arts: {
    '天まで届け、みんなの願い': {
      *run(ctx) {
        if (ctx.player.deck.length === 0) return;
        const ok = yield ctx.confirm('デッキの上から1枚をアーカイブしますか？（サポートカードならこのアーツ+50）');
        if (!ok) return;
        const top = ctx.player.deck[0];
        ctx.removeFromDeck(top);
        ctx.player.archive.push(top);
        ctx.log(`${ctx.player.name}: ${top.name} をアーカイブした`);
        if (top.kind === 'support') {
          ctx.addArtBonus(50, 'アーカイブしたカードがサポート');
        }
      },
    },
  },
};
