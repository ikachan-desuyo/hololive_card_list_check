/**
 * シオリ・ノヴェラ (hBP07-062) 青・2nd・HP200（#EN #Advent）
 * コラボエフェクト「A New Crime & A New Me」:
 *   自分の手札のサポートカード2枚をアーカイブできる：
 *   自分のステージのホロメン1人を選ぶ。このターンの間、選んだホロメンのアーツ+50。
 * アーツ「解き放たれた禁断の知識」(60+ / 特攻: 赤+50):
 *   自分のアーカイブのエール1枚を自分の#Adventを持つホロメンに送る。その後、
 *   自分の推しホロメンが〈シオリ・ノヴェラ〉で、このホロメンにエールが4枚以上付いているなら、
 *   このアーツ+100。
 */
export default {
  number: 'hBP07-062',
  collabEffect: {
    name: 'A New Crime & A New Me',
    *run(ctx) {
      // コスト: 手札のサポートカード2枚をアーカイブ（任意・できる）
      const supports = ctx.player.hand.filter((c) => c.kind === 'support');
      if (supports.length < 2) return;
      const ok = yield ctx.confirm('手札のサポートカード2枚をアーカイブしてホロメン1人のアーツ+50しますか？');
      if (!ok) return;
      const picked = [];
      for (let i = 0; i < 2; i++) {
        const candidates = ctx.player.hand.filter((c) => c.kind === 'support' && !picked.includes(c));
        const sel = yield ctx.chooseCard({
          cards: candidates,
          title: `アーカイブするサポートカードを選択 (${i + 1}/2)`,
        });
        if (!sel) return; // 途中で選べなければコスト未成立。何も起こさない
        picked.push(sel);
      }
      for (const c of picked) {
        ctx.removeFromHand(c);
        ctx.player.archive.push(c);
      }
      ctx.log('サポートカード2枚をアーカイブした');
      const target = yield ctx.chooseHolomem({
        side: 'self',
        title: 'このターン アーツ+50するホロメンを選択',
      });
      if (!target) return;
      const chosen = target.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus', amount: 50, ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターン、${chosen.stack[0].name} のアーツ+50`,
      });
    },
  },
  arts: {
    '解き放たれた禁断の知識': {
      *run(ctx) {
        // アーカイブのエール1枚を自分の#Adventホロメンに送る
        const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
        if (cheers.length === 0) return;
        const advents = ctx.holomems('self', (e) => ctx.hasTag(e.top, 'Advent'));
        if (advents.length === 0) return;
        const cheer = yield ctx.chooseCard({
          cards: cheers,
          title: '#Adventホロメンに送るエールを選択（アーカイブ）',
        });
        if (!cheer) return;
        const dest = yield ctx.chooseHolomem({
          side: 'self', filter: (e) => ctx.hasTag(e.top, 'Advent'),
          title: 'エールを送る#Adventホロメンを選択',
        });
        if (!dest) return;
        ctx.removeFromArchive(cheer);
        ctx.attachCheer(cheer, dest.holomem);
      },
      dmgBonus(ctx) {
        // run でエール送付を解決した後に評価される。
        // 推しが〈シオリ・ノヴェラ〉で、このホロメンにエール4枚以上なら +100。
        if (ctx.player.oshi?.name !== 'シオリ・ノヴェラ') return 0;
        const cheerCount = ctx.sourceHolomem?.cheers?.length || 0;
        return cheerCount >= 4 ? 100 : 0;
      },
    },
  },
};
