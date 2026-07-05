/**
 * 森カリオペ (hBP02-054) 紫・Debut・HP90（#EN #Myth #歌）
 * アーツ「グリム・リーパーの第一弟子」(30+):
 *   自分のアーカイブにホロメンがある時、このアーツ+10。
 */
export default {
  number: 'hBP02-054',
  arts: {
    'グリム・リーパーの第一弟子': {
      dmgBonus(ctx) {
        const hasHolomemInArchive = ctx.player.archive.some((c) => c.kind === 'holomen');
        return hasHolomemInArchive ? 10 : 0;
      },
    },
  },
};
