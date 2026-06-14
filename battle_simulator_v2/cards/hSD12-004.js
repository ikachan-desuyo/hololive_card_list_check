/**
 * シオリ・ノヴェラ (hSD12-004) 青・1st・HP170（#EN #Advent）
 *
 * アーツ「不穏な忠告」(20):
 *   「このアーツは、相手のバックホロメンも対象にできる。」
 *   → arts定義の extraTargetZones:['back'] で実装（このアーツのみ相手バックも対象にできる）。基本ダメージ20。
 *
 * アーツ「Just a Humble, Kind Witch」(30):
 *   自分のアーカイブにサポートカードが4枚以上あるなら、
 *   自分のエールデッキの上から1枚を自分の#Adventを持つホロメンに送る。
 *   → run で実装。
 */
export default {
  number: 'hSD12-004',
  arts: {
    // 「不穏な忠告」(20): このアーツは相手のバックホロメンも対象にできる（対象拡張）
    '不穏な忠告': {
      extraTargetZones: ['back'],
    },
    'Just a Humble, Kind Witch': {
      *run(ctx) {
        // 自分のアーカイブのサポートカードが4枚以上か
        const supportCount = ctx.player.archive.filter((c) => c.kind === 'support').length;
        if (supportCount < 4) return;
        if (!ctx.player.cheerDeck || ctx.player.cheerDeck.length === 0) return;
        // 送り先: 自分の#Adventを持つホロメン
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => ctx.hasTag(e.top, 'Advent'),
          title: 'エールデッキの上から1枚を送る#Adventホロメンを選択',
          optional: true,
        });
        if (target) ctx.sendCheerFromCheerDeckTop(target.holomem);
      },
    },
  },
};
