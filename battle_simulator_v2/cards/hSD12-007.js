/**
 * シオリ・ノヴェラ (hSD12-007) 青・2nd・HP200（#EN #Advent）
 *
 * ギフト/キーワード「どんな知識が得られるかしら」:
 *   [ターンに1回]このホロメンが相手のホロメンをダウンさせた時、
 *   自分のアーカイブのLIMITED以外のサポートカード1枚を手札に戻す。
 *   → triggers.onOpponentDown（ダウンさせた時に発火）。ターン1回制限は oncePerTurn で管理。
 *
 * アーツ「私達を見くびらないで貰える？」(110):
 *   相手のDebut以外のホロメン1人に、自分のステージの#Adventを持つホロメン1人につき、特殊ダメージ10を与える。
 */
export default {
  number: 'hSD12-007',
  triggers: {
    *onOpponentDown(ctx) {
      const key = 'hSD12-007:gift';
      if (ctx.oncePerTurnUsed(key)) return; // [ターンに1回]
      const cand = ctx.player.archive.filter((c) => c.kind === 'support' && !c.limited);
      if (cand.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: cand,
        title: 'アーカイブから手札に戻すLIMITED以外のサポートを選択（任意）',
        optional: true,
        skipLabel: '戻さない',
      });
      if (!picked) return;
      ctx.removeFromArchive(picked);
      ctx.addToHand(picked);
      ctx.markOncePerTurn(key);
    },
  },
  arts: {
    '私達を見くびらないで貰える？': {
      *run(ctx) {
        // 自分のステージの#Adventを持つホロメン1人につき特殊ダメージ10
        const adventCount = ctx.holomems('self', (e) => ctx.hasTag(e.top, 'Advent')).length;
        if (adventCount === 0) return;
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.top.bloomLevel !== 'Debut',
          title: `特殊ダメージ${adventCount * 10}を与える相手ホロメンを選択（Debut以外）`,
        });
        if (!target) return;
        yield* ctx.dealSpecialDamage(target, adventCount * 10);
      },
    },
  },
};
