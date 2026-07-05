/**
 * エリザベス・ローズ・ブラッドフレイム (hBP07-047) 赤・1st・HP120（#EN #Justice #歌）
 *
 * コラボエフェクト「…Very well.」:
 *   自分の推しホロメンが〈エリザベス・ローズ・ブラッドフレイム〉なら、
 *   自分のデッキの上から1枚をホロパワーにする。
 *
 * アーツ「さあ、かかってくるといい」(dmg:50): テキスト効果なし（素点のみ）。
 */
export default {
  number: 'hBP07-047',
  collabEffect: {
    name: '…Very well.',
    *run(ctx) {
      const p = ctx.player;
      if (p.oshi?.name !== 'エリザベス・ローズ・ブラッドフレイム') return;
      if (p.deck.length === 0) return;
      p.holoPower.push(p.deck.shift());
      ctx.log(`${p.name}: デッキの上から1枚をホロパワーにした（ホロパワー${p.holoPower.length}）`);
    },
  },
};
