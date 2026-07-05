/**
 * ロボ子さん (hBP06-066) 紫・2nd・HP200（#JP #0期生 #シューター）
 *
 * アーツ「＜封印＞ ダークブライダル」(160):
 *   このホロメンに〈ろぼさー〉が3枚以上付いているなら、相手のセンターホロメンか
 *   コラボホロメンに特殊ダメージ70を与える。
 *   → arts.run で条件判定し dealSpecialDamage(70)
 *
 * キーワード/ギフト「どり～む_コネクト.zero」:
 *   [センターポジション限定]自分の#0期生を持つコラボホロメンがアーツを使った時、
 *   自分のデッキからカード1枚を公開しアーカイブ、デッキをシャッフルする。
 *   → triggers.onAllyArtsUse で実装。このロボ子さんがセンターで、使用者(ctx.attackInfo.sourceHolomem)が
 *     #0期生のコラボなら、デッキから1枚を公開・アーカイブしてシャッフルする。
 */
export default {
  number: 'hBP06-066',
  triggers: {
    *onAllyArtsUse(ctx) {
      if (ctx.engine._zoneOf(ctx.sourceHolomem) !== 'center') return; // [センターポジション限定]（このロボ子さん）
      const user = ctx.attackInfo?.sourceHolomem;
      if (!user) return;
      if (ctx.engine._zoneOf(user) !== 'collab') return;              // コラボホロメンが
      if (!(user.stack[0].tags || []).includes('0期生')) return;      // #0期生を持つ
      if (ctx.player.deck.length === 0) return;
      // デッキからカード1枚を公開しアーカイブ→シャッフル
      const picked = yield ctx.chooseCard({ cards: ctx.deckCards(() => true), title: 'デッキから公開してアーカイブするカードを選択' });
      if (picked) { ctx.removeFromDeck(picked); ctx.flashReveal(picked); ctx.player.archive.push(picked); }
      ctx.shuffleDeck();
    },
  },
  arts: {
    '＜封印＞ ダークブライダル': {
      *run(ctx) {
        // このホロメンに〈ろぼさー〉が3枚以上付いているか
        const robosaa = (ctx.sourceHolomem.attachments || []).filter((a) => a.name === 'ろぼさー').length;
        if (robosaa < 3) return;
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'collab',
          title: '特殊ダメージ70を与える相手ホロメンを選択（センターかコラボ）',
        });
        if (target) yield* ctx.dealSpecialDamage(target, 70);
      },
    },
  },
};
