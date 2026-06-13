/**
 * 小鳥遊キアラ (hBP01-066) 赤・1st・HP120（#EN #Myth #トリ）
 * アーツ「不死鳥の剣姫」(50): 効果なし。
 * アーツ「跪きなさい。」(40):
 *   このホロメンに重なっているホロメン1枚をアーカイブできる：
 *   相手のコラボホロメンに特殊ダメージ40を与える。
 *   → コスト: bloom stack の下のホロメン1枚をアーカイブ。
 */
export default {
  number: 'hBP01-066',
  arts: {
    '跪きなさい。': {
      *run(ctx) {
        // コスト: 重なっているホロメン（stack[1..]）が1枚以上必要
        const lower = ctx.sourceHolomem.stack.slice(1);
        if (lower.length === 0) return;
        // 効果対象: 相手のコラボホロメンが存在しなければ意味がない
        const collab = ctx.holomems('opp', (e) => e.pos.zone === 'collab');
        if (collab.length === 0) return;
        const ok = yield ctx.confirm('重なっているホロメン1枚をアーカイブして相手のコラボホロメンに特殊ダメージ40を与えますか？');
        if (!ok) return;
        // コスト支払い
        const card = yield ctx.chooseCard({
          cards: ctx.sourceHolomem.stack.slice(1),
          title: 'アーカイブする重なっているホロメンを選択（コスト）',
        });
        if (!card) return;
        const idx = ctx.sourceHolomem.stack.indexOf(card);
        ctx.sourceHolomem.stack.splice(idx, 1);
        ctx.player.archive.push(card);
        ctx.log(`${card.name} をアーカイブした（コスト）`);
        // 効果本体: 相手のコラボホロメンに特殊ダメージ40
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.pos.zone === 'collab',
          title: '特殊ダメージ40を与える相手のコラボホロメンを選択',
        });
        if (target) yield* ctx.dealSpecialDamage(target, 40);
      },
    },
  },
};
