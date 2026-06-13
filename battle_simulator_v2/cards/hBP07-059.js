/**
 * シオリ・ノヴェラ (hBP07-059) 青・Debut・HP120（#EN #Advent）
 * コラボエフェクト「It's Time to Play Dress-up!」:
 *   自分が後攻で最初のターンなら、自分のアーカイブのサポートカード1枚を手札に戻す。
 *   → ctx.isFirstTurnGoingSecond() で判定。アーカイブにサポートが無ければ何もしない。
 * アーツ「A Cozy, Spooky Night Together」(any:10):
 *   相手のホロメン1人に特殊ダメージ10を与える。
 */
export default {
  number: 'hBP07-059',
  collabEffect: {
    name: "It's Time to Play Dress-up!",
    *run(ctx) {
      if (!ctx.isFirstTurnGoingSecond()) return;
      const supports = ctx.player.archive.filter((c) => c.kind === 'support');
      if (supports.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: supports,
        title: 'アーカイブから手札に戻すサポートカードを選択',
      });
      if (!picked) return;
      ctx.removeFromArchive(picked);
      ctx.addToHand(picked);
    },
  },
  arts: {
    'A Cozy, Spooky Night Together': {
      *run(ctx) {
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          title: '特殊ダメージ10を与える相手ホロメンを選択',
        });
        if (target) yield* ctx.dealSpecialDamage(target, 10);
      },
    },
  },
};
