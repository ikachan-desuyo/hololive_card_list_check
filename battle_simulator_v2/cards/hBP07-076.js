/**
 * ネリッサ・レイヴンクロフト (hBP07-076) 紫・1st・Buzzホロメン・HP260（#EN #Advent #歌 #トリ）
 *
 * コラボエフェクト「SUGOISUGOIDEKAI」:
 *   自分の推しホロメンが〈ネリッサ・レイヴンクロフト〉なら、
 *   自分のデッキを1枚引き、自分の手札1枚をホロパワーにする。
 *   → 推し名チェック後、ドロー1枚 → 手札1枚をホロパワーへ。
 *
 * アーツ「あら、捕まえられちゃった！」(50+):
 *   自分のホロパワー1枚をアーカイブできる：このアーツ+30。
 *   → 任意コスト（ホロパワー1枚アーカイブ）で +30。run 内で confirm して支払う。
 */
export default {
  number: 'hBP07-076',
  collabEffect: {
    name: 'SUGOISUGOIDEKAI',
    *run(ctx) {
      const p = ctx.player;
      if (p.oshi?.name !== 'ネリッサ・レイヴンクロフト') return;
      // デッキを1枚引く
      ctx.draw(1);
      // 手札1枚をホロパワーにする
      if (p.hand.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: [...p.hand],
        title: 'ホロパワーにする手札1枚を選択',
      });
      if (!picked) return;
      ctx.removeFromHand(picked);
      p.holoPower.push(picked);
      ctx.log(`手札1枚をホロパワーにした（ホロパワー${p.holoPower.length}）`);
    },
  },
  arts: {
    'あら、捕まえられちゃった！': {
      *run(ctx) {
        const p = ctx.player;
        if (p.holoPower.length === 0) return;
        const ok = yield ctx.confirm('ホロパワー1枚をアーカイブしてこのアーツ+30しますか？');
        if (!ok) return;
        // コスト: ホロパワー1枚をアーカイブ（上から1枚）
        p.archive.push(p.holoPower.shift());
        ctx.log(`ホロパワー1枚をアーカイブした（ホロパワー${p.holoPower.length}）`);
        ctx.addArtBonus(30, 'ホロパワー1枚アーカイブ');
      },
    },
  },
};
