/**
 * 常闇トワ (hBP03-052) 紫・Debut・HP80（JP/4期生/歌/シューター）
 * アーツ「そういう感じなんだ」(dmg:20):
 *   相手のセンターホロメンに特殊ダメージ10を与える。その後、自分の推しホロメンが
 *   〈常闇トワ〉の時、相手の[センターホロメンかコラボホロメン]に付いているツール1枚を
 *   アーカイブできる。
 */
export default {
  number: 'hBP03-052',
  arts: {
    'そういう感じなんだ': {
      *run(ctx) {
        // 相手のセンターホロメンに特殊ダメージ10
        const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
        if (center) ctx.dealSpecialDamage(center, 10);

        // その後、自分の推しホロメンが〈常闇トワ〉の時のみ追加効果
        if (ctx.player.oshi?.name !== '常闇トワ') return;

        // 相手のセンター/コラボに付いているツールを集める
        const targets = ctx.holomems('opp', (e) => e.pos.zone === 'center' || e.pos.zone === 'collab');
        const tools = [];
        for (const e of targets) {
          for (const a of e.holomem.attachments) {
            if (a.supportType === 'ツール') tools.push({ holomem: e.holomem, card: a });
          }
        }
        if (tools.length === 0) return;

        // 「できる」=任意。ツール1枚を選んでアーカイブ
        const picked = yield ctx.chooseCard({
          cards: tools.map((t) => t.card),
          title: '相手のセンター/コラボに付いているツール1枚をアーカイブ（任意）',
          optional: true,
        });
        if (!picked) return;
        const entry = tools.find((t) => t.card === picked);
        const idx = entry.holomem.attachments.indexOf(picked);
        if (idx !== -1) {
          entry.holomem.attachments.splice(idx, 1);
          ctx.opponent.archive.push(picked);
          ctx.log(`${entry.holomem.stack[0].name} の ${picked.name} をアーカイブ`);
        }
      },
    },
  },
};
