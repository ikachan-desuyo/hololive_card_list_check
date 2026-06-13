/**
 * カエラ・コヴァルスキア (hBP04-042) Buzzホロメン・赤
 * アーツ「holoh3ro」(30):
 *   自分のステージにこのホロメン以外の#ID3期生を持つホロメンがいる時、自分のデッキを1枚引く。
 * アーツ「お墨付きの一品」(90):
 *   自分の#カエラ'sアームズを持つツールが付いているホロメンがいる時、
 *   相手のコラボホロメンに特殊ダメージ30を与える。
 */
export default {
  number: 'hBP04-042',
  arts: {
    'holoh3ro': {
      *run(ctx) {
        const other = ctx.holomems('self', (e) =>
          e.holomem !== ctx.sourceHolomem && ctx.hasTag(e.top, 'ID3期生')).length > 0;
        if (other) ctx.draw(1);
      },
    },
    'お墨付きの一品': {
      *run(ctx) {
        const hasArm = ctx.holomems('self', (e) =>
          e.holomem.attachments.some((a) => (a.tags || []).includes("カエラ'sアームズ"))).length > 0;
        if (!hasArm) return;
        const target = ctx.holomems('opp', (e) => e.pos.zone === 'collab')[0];
        if (target) yield* ctx.dealSpecialDamage(target, 30);
      },
    },
  },
};
