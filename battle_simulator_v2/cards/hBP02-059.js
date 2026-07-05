/**
 * 森カリオペ (hBP02-059) 紫・2nd・HP200（#EN #Myth #歌）
 *
 * [キーワード/ブルームエフェクト] Soul Voice:
 *   自分のデッキから、カード1枚を公開し、アーカイブする。そしてデッキをシャッフルする。
 *   → デッキは非公開のため、上から1枚を公開してアーカイブする実装（「1枚」に選択の指定なし）。
 *
 * [アーツ] Featuring Myth (80+, 紫紫無 / 特攻 青+50):
 *   自分のアーカイブに#Mythを持つホロメンが4枚以上ある時、このアーツ+40。
 *   8枚以上ある時、さらに、このアーツ+40。（合計+80）
 */
export default {
  number: 'hBP02-059',
  bloomEffect: {
    name: 'Soul Voice',
    *run(ctx) {
      const seen = ctx.lookTopDeck(1);
      if (seen.length === 0) return;
      for (const c of seen) {
        ctx._unreveal(c);
        ctx.player.archive.push(c);
        ctx.log(`${ctx.player.name}: ${c.name} を公開しアーカイブした`);
      }
      ctx.recordDeckArchive(seen.length);
      ctx.shuffleDeck();
    },
  },
  arts: {
    'Featuring Myth': {
      dmgBonus(ctx) {
        const mythInArchive = ctx.player.archive.filter(
          (c) => c.kind === 'holomen' && ctx.hasTag(c, 'Myth'),
        ).length;
        let bonus = 0;
        if (mythInArchive >= 4) bonus += 40;
        if (mythInArchive >= 8) bonus += 40;
        return bonus;
      },
    },
  },
};
