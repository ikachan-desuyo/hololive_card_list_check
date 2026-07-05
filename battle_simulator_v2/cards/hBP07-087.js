/**
 * 虎金妃笑虎 (hBP07-087) 黄・Debut・HP120（#DEV_IS #FLOW #GLOW）
 * コラボエフェクト「ニコたん出動！」:
 *   自分が後攻で最初のターンなら、自分のエールデッキの上から2枚をアーカイブできる：
 *   自分のステージの#FLOW #GLOWを持つホロメン1人を選ぶ。このターンの間、選んだホロメンのアーツ+20。
 *   → collabEffect。後攻最初のターン限定。コスト＝エールデッキ上2枚をアーカイブ。
 * アーツ「現行犯逮捕だ」(20): 効果テキストなし（ダメージのみ）。
 */
export default {
  number: 'hBP07-087',
  collabEffect: {
    name: 'ニコたん出動！',
    *run(ctx) {
      if (!ctx.isFirstTurnGoingSecond()) return; // 後攻で最初のターンのみ
      if (ctx.player.cheerDeck.length < 2) return; // コスト（エール上2枚）を払えない
      // #FLOW かつ #GLOW を持つホロメンが対象
      const cands = ctx.holomems('self', (e) =>
        ctx.hasTag(e.top, 'FLOW') && ctx.hasTag(e.top, 'GLOW'));
      if (cands.length === 0) return;
      const ok = yield ctx.confirm('エールデッキの上から2枚をアーカイブして、ホロメン1人のアーツ+20しますか？');
      if (!ok) return;
      // コスト: エールデッキの上から2枚をアーカイブ
      for (let i = 0; i < 2; i++) {
        const cheer = ctx.player.cheerDeck.shift();
        if (!cheer) break;
        ctx.player.archive.push(cheer);
        ctx.log(`${ctx.player.name}: エールデッキの ${cheer.name} をアーカイブ`);
      }
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.hasTag(e.top, 'FLOW') && ctx.hasTag(e.top, 'GLOW'),
        title: 'このターン アーツ+20する #FLOW #GLOW ホロメンを選択',
      });
      if (!target) return;
      const chosen = target.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus', amount: 20, ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターン、${chosen.stack[0].name} のアーツ+20`,
      });
    },
  },
  arts: {
    // 「現行犯逮捕だ」は dmg:20 のみで追加効果なし。
  },
};
