/**
 * 尾丸ポルカ (hBP05-032) 赤・1st・HP130（#5期生）
 * ブルームエフェクト「ポルカとのなんでもない休日」: 相手のコラボホロメンに特殊ダメージ20を与える。
 * アーツ「朝のポルカ ※若干のフィクション」(50):
 *   自分の手札1枚をアーカイブできる：相手のセンターホロメンかコラボホロメンに特殊ダメージ10を与える。
 */
export default {
  number: 'hBP05-032',
  bloomEffect: {
    name: 'ポルカとのなんでもない休日',
    *run(ctx) {
      const collab = ctx.holomems('opp', (e) => e.pos.zone === 'collab')[0];
      if (collab) ctx.dealSpecialDamage(collab, 20);
    },
  },
  arts: {
    '朝のポルカ ※若干のフィクション': {
      *run(ctx) {
        if (ctx.player.hand.length === 0) return;
        const ok = yield ctx.confirm('手札1枚をアーカイブして特殊ダメージ10を与えますか？');
        if (!ok) return;
        const card = yield ctx.chooseCard({ cards: [...ctx.player.hand], title: 'コスト: アーカイブする手札を選択' });
        if (!card) return;
        ctx.removeFromHand(card);
        ctx.player.archive.push(card);
        ctx.log(`${card.name} をアーカイブした`);
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'collab',
          title: '特殊ダメージ10を与える相手ホロメンを選択（センターかコラボ）',
        });
        if (target) ctx.dealSpecialDamage(target, 10);
      },
    },
  },
};
