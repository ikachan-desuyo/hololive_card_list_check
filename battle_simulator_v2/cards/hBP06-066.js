/**
 * ロボ子さん (hBP06-066) 紫・2nd・HP200（#JP #0期生 #シューター）
 *
 * アーツ「＜封印＞ ダークブライダル」(160):
 *   このホロメンに〈ろぼさー〉が3枚以上付いているなら、相手のセンターホロメンか
 *   コラボホロメンに特殊ダメージ70を与える。
 *   → arts.run で条件判定し dealSpecialDamage(70)
 *
 * 【未実装】キーワード/ギフト「どり～む_コネクト.zero」:
 *   [センターポジション限定]自分の#0期生を持つコラボホロメンがアーツを使った時、
 *   自分のデッキからカード1枚を公開しアーカイブ、デッキをシャッフルする。
 *   → 「（他ホロメンが）アーツを使った時」= onArtsUse トリガーが必要だが
 *     当エンジンには未実装の機構のため保留。
 */
export default {
  number: 'hBP06-066',
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
        if (target) ctx.dealSpecialDamage(target, 70);
      },
    },
  },
};
