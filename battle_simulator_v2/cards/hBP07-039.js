/**
 * 赤井はあと (hBP07-039) 赤・1st・HP160（#JP #1期生 #料理）
 *
 * アーツ「俺の名は〝ちゃまお〟漢の中の漢だ！」(50):
 *   相手のセンターホロメンに特殊ダメージ20を与える。
 *   → arts.run で実装。
 *
 * [キーワード/ギフト]「血ゃ舞ってる奴いる！？」:
 *   [ターンに1回]自分のターンで、自分の〈赤井はあと〉がステージからデッキに戻った時、
 *   自分のアーカイブのエール1枚をこのホロメンに送れる。
 *   → triggers.onReturnedToDeck で実装。engine の returnHolomemToDeck がデッキに戻った時に
 *     自分のステージホロメンの onReturnedToDeck を発火する（戻ったカード=ctx.returnedToDeckInfo.cards）。
 *     戻ったのが〈赤井はあと〉で、このホロメンも〈赤井はあと〉、自分のターンなら[ターン1回]エールを送る。
 */
export default {
  number: 'hBP07-039',
  triggers: {
    *onReturnedToDeck(ctx) {
      if (ctx.state.turnPlayer !== ctx.playerIdx) return;              // 自分のターン
      if (ctx.sourceHolomem?.stack[0].name !== '赤井はあと') return;   // このホロメンが〈赤井はあと〉
      const returned = ctx.returnedToDeckInfo?.cards || [];
      if (!returned.some((c) => c.name === '赤井はあと')) return;       // 戻ったのが〈赤井はあと〉
      if (ctx.oncePerTurnUsed('hBP07-039:cheer')) return;              // [ターンに1回]
      const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
      if (cheers.length === 0) return;
      const picked = yield ctx.chooseCard({ cards: cheers, title: 'このホロメンに送るエールをアーカイブから選択（任意）', optional: true });
      if (!picked) return;
      ctx.markOncePerTurn('hBP07-039:cheer');
      ctx.removeFromArchive(picked);
      ctx.attachCheer(picked, ctx.sourceHolomem);
    },
  },
  arts: {
    '俺の名は〝ちゃまお〟漢の中の漢だ！': {
      *run(ctx) {
        const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
        if (center) yield* ctx.dealSpecialDamage(center, 20);
      },
    },
  },
};
