/**
 * 宝鐘マリン (hSD09-004) 赤・2nd・HP200（#JP,#3期生,#絵,#海）
 * アーツ「3期生の絆」(60): 自分のステージに〈宝鐘マリン〉以外の#3期生を持つ
 *   ホロメンがいるなら、自分のデッキを1枚引く。
 * アーツ「キミたちと水平線の向こう側へ」(120): 相手のセンターホロメンとコラボホロメンに、
 *   自分のステージの異なるカード名の#3期生を持つホロメン1人につき、特殊ダメージ10を与える。
 *   → 「異なるカード名」= 自分のステージ上の#3期生ホロメン（このマリン自身も含む）の
 *     ユニークなカード名の数。その数 ×10 を相手センターとコラボそれぞれに与える。
 */
export default {
  number: 'hSD09-004',
  arts: {
    '3期生の絆': {
      *run(ctx) {
        const hasOtherGen3 = ctx.holomems('self', (e) =>
          e.holomem !== ctx.sourceHolomem && ctx.hasTag(e.top, '3期生')
        ).length > 0;
        if (hasOtherGen3) {
          ctx.draw(1);
        }
      },
    },
    'キミたちと水平線の向こう側へ': {
      *run(ctx) {
        // 自分のステージの「異なるカード名」の#3期生ホロメン数（このホロメン自身も#3期生で含む）
        const names = new Set();
        for (const e of ctx.holomems('self', (en) => ctx.hasTag(en.top, '3期生'))) {
          names.add(e.top.name);
        }
        const count = names.size;
        if (count <= 0) return;
        const amount = count * 10;
        // 相手のセンターホロメンとコラボホロメンが対象
        const targets = ctx.holomems('opp', (e) =>
          e.pos.zone === 'center' || e.pos.zone === 'collab'
        );
        for (const t of targets) {
          yield* ctx.dealSpecialDamage(t, amount);
        }
      },
    },
  },
};
