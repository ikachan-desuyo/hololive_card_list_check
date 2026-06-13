/**
 * アイラニ・イオフィフティーン (hBP07-031) 緑・Buzzホロメン・1st・HP240（#ID #ID1期生 #絵）
 *
 * ブルームエフェクト「この輝きが私達！」:
 *   自分のホロパワーの上から2枚をアーカイブできる：自分のデッキを2枚引く。
 *   （任意効果。ホロパワーが2枚以上ある時のみ実行可能。「上から」= holoPower 先頭の2枚）
 *
 * アーツ「ひとつになる声」 dmg:50:
 *   自分の推しホロメンの色が緑か青か黄なら、自分のデッキの上から1枚をホロパワーにする。
 */
export default {
  number: 'hBP07-031',
  bloomEffect: {
    name: 'この輝きが私達！',
    *run(ctx) {
      // ホロパワーが2枚以上ある時のみ（コストを払えないと効果も得られない）
      if (ctx.player.holoPower.length < 2) return;
      const ok = yield ctx.confirm('ホロパワーの上から2枚をアーカイブしてデッキを2枚引きますか？');
      if (!ok) return;
      // 「上から2枚」= holoPower 先頭（index 0,1）。コラボ時に末尾へ push される運用に合わせ先頭が上。
      const removed = ctx.player.holoPower.splice(0, 2);
      ctx.player.archive.push(...removed);
      ctx.log(`${ctx.player.name}: ホロパワーの上から2枚をアーカイブ（${removed.map((c) => c.name).join(' / ')}）`);
      ctx.draw(2);
    },
  },
  arts: {
    'ひとつになる声': {
      *run(ctx) {
        const oshiColor = ctx.player.oshi?.color;
        if (oshiColor !== '緑' && oshiColor !== '青' && oshiColor !== '黄') return;
        if (ctx.player.deck.length === 0) return;
        // デッキの上から1枚をホロパワーにする（コラボのホロパワー追加と同じく末尾へ）
        const card = ctx.player.deck.shift();
        ctx.player.holoPower.push(card);
        ctx.log(`${ctx.player.name}: デッキの上から1枚をホロパワーにした（ホロパワー+1）`);
      },
    },
  },
};
