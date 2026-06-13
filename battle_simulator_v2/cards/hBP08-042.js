/**
 * 小鳥遊キアラ (hBP08-042) 赤・1st・HP170（#EN #Myth #トリ）
 *
 * ブルームエフェクト「グーテンモルゲン -穏やかな朝-」:
 *   自分の手札1～3枚をアーカイブできる：自分のステージのホロメン1人を選ぶ。
 *   この能力でアーカイブしたカード1枚につき、このターンの間、選んだホロメンのアーツ+10。
 *   → 「1～3枚をアーカイブできる」= 任意起動（confirm）＋ 1枚は必須・最大3枚（2枚目以降は optional でやめられる）。
 *     アーカイブ枚数 × 10 を、選んだ1人だけに artsPlus ターン修正で付与する（hBP08-018 と同形の単体match）。
 *     手札が1枚も無ければ発動不可。
 *
 * アーツ「キワワとチョンカーズ＆スムージー」(40): 効果テキストなし（ダメージのみ。エンジンが素点処理）。
 *
 * 保留: なし。
 */
export default {
  number: 'hBP08-042',

  bloomEffect: {
    name: 'グーテンモルゲン -穏やかな朝-',
    *run(ctx) {
      // 手札が無ければコストを支払えない（最低1枚アーカイブが必要）
      if (ctx.player.hand.length === 0) return;

      const ok = yield ctx.confirm(
        '手札1～3枚をアーカイブして、選んだホロメンのアーツを強化しますか？');
      if (!ok) return;

      // コスト: 手札を1～3枚アーカイブ（1枚目は必須、2・3枚目は「やめる」可）
      const archived = [];
      while (archived.length < 3 && ctx.player.hand.length > 0) {
        const optional = archived.length >= 1;
        const cost = yield ctx.chooseCard({
          cards: [...ctx.player.hand],
          title: `コスト: アーカイブする手札を選択（${archived.length + 1}枚目／最大3枚）`,
          optional,
          skipLabel: 'これ以上アーカイブしない',
        });
        if (!cost) break;
        ctx.removeFromHand(cost);
        ctx.player.archive.push(cost);
        ctx.log(`${ctx.player.name}: ${cost.name} をアーカイブした`);
        archived.push(cost);
      }
      if (archived.length === 0) return;

      // 効果: 自分のステージのホロメン1人を選び、+10×枚数のアーツ修正
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        title: 'アーツを強化するホロメンを選択',
      });
      if (!entry) return;

      const selected = entry.holomem;
      const amount = archived.length * 10;
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount,
        ownerIdx: ctx.playerIdx,
        match: (hm) => hm === selected,
        description: `このターンの間、${entry.top.name}のアーツ+${amount}（手札${archived.length}枚アーカイブ）`,
      });
    },
  },
};
