/**
 * ジジ・ムリン (hSD13-011) 黄・1st・HP140（#EN #Justice）
 * ブルームエフェクト「I am Gonathan G.」:
 *   このホロメンに重なっているDebutホロメン1枚をアーカイブできる：
 *   相手のコラボホロメンに特殊ダメージ20を与える。
 *   → コスト: bloom stack の下にある Debut ホロメン1枚をアーカイブ。
 * アーツ「すべての意味を追い求めて」(40+):
 *   このホロメンに重なっているホロメンが0枚なら、このアーツ+20。
 *   → stack[1..] が空（重なっているホロメンが0枚）なら +20。
 */
export default {
  number: 'hSD13-011',
  bloomEffect: {
    name: 'I am Gonathan G.',
    *run(ctx) {
      // コスト: 重なっている Debut ホロメン（stack[1..] のうち bloomLevel === 'Debut'）が1枚以上必要
      const debutLower = ctx.sourceHolomem.stack.slice(1).filter((c) => c.bloomLevel === 'Debut');
      if (debutLower.length === 0) return;
      // 効果対象: 相手のコラボホロメンが存在しなければ意味がない
      const collab = ctx.holomems('opp', (e) => e.pos.zone === 'collab');
      if (collab.length === 0) return;
      const ok = yield ctx.confirm('重なっているDebutホロメン1枚をアーカイブして相手のコラボホロメンに特殊ダメージ20を与えますか？');
      if (!ok) return;
      // コスト支払い: Debut ホロメンを1枚選んでアーカイブ
      const card = yield ctx.chooseCard({
        cards: debutLower,
        title: 'アーカイブする重なっているDebutホロメンを選択（コスト）',
      });
      if (!card) return;
      const idx = ctx.sourceHolomem.stack.indexOf(card);
      ctx.sourceHolomem.stack.splice(idx, 1);
      ctx.player.archive.push(card);
      ctx.log(`${card.name} をアーカイブした（コスト）`);
      // 効果本体: 相手のコラボホロメンに特殊ダメージ20
      const target = yield ctx.chooseHolomem({
        side: 'opp',
        filter: (e) => e.pos.zone === 'collab',
        title: '特殊ダメージ20を与える相手のコラボホロメンを選択',
      });
      if (target) yield* ctx.dealSpecialDamage(target, 20);
    },
  },
  arts: {
    'すべての意味を追い求めて': {
      dmgBonus(ctx) {
        // 重なっているホロメン（stack[1..]）が0枚なら +20
        return ctx.sourceHolomem.stack.length <= 1 ? 20 : 0;
      },
    },
  },
};
