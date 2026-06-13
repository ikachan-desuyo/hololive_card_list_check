/**
 * ロボ子さん (hBP06-063) 紫・1st・HP150（#JP #0期生 #シューター）
 * ブルームエフェクト「プリンとお子様オムライス」:
 *   自分の〈ろぼさー〉が付いているホロメンがいるなら、相手のセンターホロメンに特殊ダメージ20を与える。
 * アーツ「んーーーおいしい[๑´ڡ`๑]♡」(30):
 *   自分の推しホロメンが〈ロボ子さん〉なら、自分のデッキを1枚引く。
 */
export default {
  number: 'hBP06-063',
  bloomEffect: {
    name: 'プリンとお子様オムライス',
    *run(ctx) {
      const hasRobosaa = ctx.holomems('self', (e) =>
        e.holomem.attachments.some((a) => a.name === 'ろぼさー')
      ).length > 0;
      if (!hasRobosaa) return;
      const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
      if (center) yield* ctx.dealSpecialDamage(center, 20);
    },
  },
  arts: {
    'んーーーおいしい[๑´ڡ`๑]♡': {
      *run(ctx) {
        if (ctx.player.oshi?.name === 'ロボ子さん') ctx.draw(1);
      },
    },
  },
};
