/**
 * ハコス・ベールズ 1st (hBP01-074) 赤・HP90（#EN #Promise #ケモミミ）
 * ブルームエフェクト「ネズミアイドルがいよいよ登場！」:
 *   DebutからBloomした時、自分のアーカイブの[Debutホロメンか1stホロメン]1枚を手札に戻せる：
 *   戻したカードが#ENを持つ時、相手のコラボホロメンに特殊ダメージ20を与える。
 * アーツ「楽しい時間の始まりだ！」(dmg:30):
 *   テキスト効果なし（基本ダメージのみ）。
 */
export default {
  number: 'hBP01-074',
  bloomEffect: {
    name: 'ネズミアイドルがいよいよ登場！',
    *run(ctx) {
      // 「DebutからBloomした時」: Bloom直前のカード（重ねた下のカード）がDebutであること
      if (ctx.sourceHolomem?.stack?.[1]?.bloomLevel !== 'Debut') return;

      const candidates = ctx.player.archive.filter(
        (c) => c.kind === 'holomen' && (c.bloomLevel === 'Debut' || c.bloomLevel === '1st'),
      );
      if (candidates.length === 0) return;

      // 「戻せる」=任意
      const ok = yield ctx.confirm('アーカイブの[Debut/1stホロメン]1枚を手札に戻しますか？');
      if (!ok) return;

      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: '手札に戻すホロメンを選択（DebutホロメンまたはR1stホロメン）',
      });
      if (!picked) return;

      ctx.removeFromArchive(picked);
      ctx.addToHand(picked, { reveal: true });

      // 戻したカードが#ENを持つ時、相手のコラボホロメンに特殊ダメージ20
      if (ctx.hasTag(picked, 'EN')) {
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.pos.zone === 'collab',
          title: '特殊ダメージ20を与える相手のコラボホロメンを選択',
          optional: true,
        });
        if (target) yield* ctx.dealSpecialDamage(target, 20);
      }
    },
  },
};
