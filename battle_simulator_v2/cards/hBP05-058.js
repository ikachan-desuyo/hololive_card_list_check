/**
 * ネリッサ・レイヴンクロフト (hBP05-058) 紫・Debut・HP100（#EN/Advent）
 * コラボエフェクト「SUGOIDEKAI」: 自分が後攻で最初のターンで、自分の推しホロメンが
 *   〈ネリッサ・レイヴンクロフト〉なら、自分のデッキの上から1枚をホロパワーにする。
 *   （コラボ時のホロパワー+1 8.4.3 とは別に、追加でさらに1枚ホロパワーへ）
 * アーツ「Bye-ya, darlings!」: 効果テキストなし（ダメージのみ）→ run 不要。
 *
 * 保留: なし。
 *   ※ホロパワー専用プリミティブは無いため ctx.player.holoPower / deck を直接操作する
 *     （カードは常にいずれかの領域に属する＝保存則を満たす。engine.js 8.4.3 と同手法）。
 */
export default {
  number: 'hBP05-058',
  collabEffect: {
    name: 'SUGOIDEKAI',
    *run(ctx) {
      // 後攻で最初のターンの条件
      if (!ctx.isFirstTurnGoingSecond()) return;
      // 自分の推しホロメンが〈ネリッサ・レイヴンクロフト〉なら
      if (ctx.player.oshi?.name !== 'ネリッサ・レイヴンクロフト') return;
      const p = ctx.player;
      if (p.deck.length === 0) return;
      p.holoPower.push(p.deck.shift());
      ctx.log(`${p.name}: SUGOIDEKAI でデッキの上から1枚をホロパワーにした（ホロパワー+1）`);
    },
  },
};
