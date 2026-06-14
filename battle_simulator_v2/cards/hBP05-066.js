/**
 * 不知火フレア (hBP05-066) 黄・1st・HP180（#JP #3期生 #ハーフエルフ）
 *
 * [アーツ] 氷姿雪魄 (30+):
 *   自分のステージの異なるカード名の#3期生を持つホロメン1人につき、このアーツ+10。
 *   → dmgBonus: 自分のステージの #3期生 ホロメンのカード名の種類数 × 10。 実装済み。
 *
 * [キーワード/ギフト] 冬の旅:
 *   [コラボポジション限定]自分の#3期生を持つセンターホロメンがアーツを使った時、
 *   自分の手札1枚をアーカイブできる：自分のデッキを1枚引く。
 *   → triggers.onAllyArtsUse（自ステージの他ホロメンのアーツ使用時に発火。ctx.attackInfo.sourceHolomem=
 *     使用者）。このカードがコラボ位置で、使用者が#3期生センターなら、手札1枚をアーカイブして1ドロー（任意）。
 */
export default {
  number: 'hBP05-066',
  arts: {
    '氷姿雪魄': {
      dmgBonus(ctx) {
        // 自分のステージの #3期生 を持つホロメンの「異なるカード名」の数 × 10
        const names = new Set();
        for (const { top } of ctx.holomems('self', ({ top }) => ctx.hasTag(top, '3期生'))) {
          names.add(top.name);
        }
        return names.size * 10;
      },
    },
  },
  triggers: {
    // ギフト「冬の旅」: [コラボ限定]#3期生センターがアーツを使った時、手札1枚をアーカイブして1ドロー（任意）
    *onAllyArtsUse(ctx) {
      if (ctx.sourceHolomemPos()?.zone !== 'collab') return; // [コラボポジション限定]
      const user = ctx.attackInfo?.sourceHolomem;
      if (!user || ctx.engine._zoneOf(user) !== 'center' || !(user.stack[0].tags || []).includes('3期生')) return;
      if (ctx.player.hand.length === 0) return;
      const card = yield ctx.chooseCard({
        cards: [...ctx.player.hand], title: '手札1枚をアーカイブして1ドロー（任意）', optional: true, skipLabel: '使わない',
      });
      if (!card) return;
      ctx.removeFromHand(card);
      ctx.player.archive.push(card);
      ctx.draw(1);
    },
  },
};
