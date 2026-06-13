/**
 * 百鬼あやめ (hBP06-038) 赤・1st・HP140（#JP #2期生 #シューター）
 * コラボエフェクト「たまに増える余」:
 *   自分のエールデッキの上から1枚をアーカイブできる：自分のアーカイブの〈百鬼あやめ〉1枚を手札に戻す。
 *   → コスト（エールデッキ上1枚アーカイブ）は「できる」=任意。
 * アーツ「では参る！」(30):
 *   自分のエールデッキの上から1枚をアーカイブできる：相手のセンターホロメンかコラボホロメンに特殊ダメージ20を与える。
 *   → コストは任意。払えば追加で特殊ダメージ20。
 */
export default {
  number: 'hBP06-038',
  collabEffect: {
    name: 'たまに増える余',
    *run(ctx) {
      // コスト（任意）: エールデッキの上から1枚をアーカイブ
      if (ctx.player.cheerDeck.length === 0) return; // 払えなければ効果なし
      const ayames = ctx.player.archive.filter((c) => c.kind === 'holomen' && c.name === '百鬼あやめ');
      if (ayames.length === 0) return; // 戻せる対象が無いなら、コストを払う意味が無い
      const ok = yield ctx.confirm('エールデッキの上から1枚をアーカイブして、アーカイブの〈百鬼あやめ〉1枚を手札に戻しますか？');
      if (!ok) return;
      const cheer = ctx.player.cheerDeck.shift();
      ctx.flashReveal(cheer);
      ctx.player.archive.push(cheer);
      ctx.log(`エールデッキの上から ${cheer.name} をアーカイブ`);
      const picked = yield ctx.chooseCard({
        cards: ayames,
        title: '手札に戻す〈百鬼あやめ〉を選択',
      });
      if (picked) {
        ctx.removeFromArchive(picked);
        ctx.addToHand(picked, { reveal: false });
      }
    },
  },
  arts: {
    'では参る！': {
      *run(ctx) {
        // コスト（任意）: エールデッキの上から1枚をアーカイブ → 特殊ダメージ20
        if (ctx.player.cheerDeck.length === 0) return;
        const ok = yield ctx.confirm('エールデッキの上から1枚をアーカイブして、相手のセンター/コラボに特殊ダメージ20を与えますか？');
        if (!ok) return;
        const cheer = ctx.player.cheerDeck.shift();
        ctx.flashReveal(cheer);
        ctx.player.archive.push(cheer);
        ctx.log(`エールデッキの上から ${cheer.name} をアーカイブ`);
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'collab',
          title: '特殊ダメージ20を与える相手ホロメンを選択（センターかコラボ）',
        });
        if (target) ctx.dealSpecialDamage(target, 20);
      },
    },
  },
};
