/**
 * 小鳥遊キアラ (hBP01-067) 赤・2nd・HP200（#EN #Myth #トリ）
 * アーツ「焔色の導き」(70): 効果なし（特攻のみ）。
 * アーツ「マジェスティック・フェニックス」(80+):
 *   自分のアーカイブのホロメン1枚につき、このアーツ+10。
 *   そして自分のアーカイブのホロメン6枚をデッキに戻してシャッフルする。
 *   ※「6枚」だがアーカイブのホロメンが6枚未満なら全て戻す。
 *   ※ボーナスはアーカイブに戻す前のホロメン枚数で計算する（解決中の同一処理）。
 */
export default {
  number: 'hBP01-067',
  arts: {
    'マジェスティック・フェニックス': {
      *run(ctx) {
        const holomemInArchive = ctx.player.archive.filter((c) => c.kind === 'holomen');
        // アーカイブのホロメン1枚につき +10
        if (holomemInArchive.length > 0) {
          ctx.addArtBonus(holomemInArchive.length * 10, 'アーカイブのホロメン枚数');
        }
        // アーカイブのホロメン6枚（未満なら全て）をデッキに戻してシャッフル
        const returned = [];
        const max = Math.min(6, holomemInArchive.length);
        for (let i = 0; i < max; i++) {
          const remaining = ctx.player.archive.filter(
            (c) => c.kind === 'holomen' && !returned.includes(c),
          );
          if (remaining.length === 0) break;
          const picked = yield ctx.chooseCard({
            cards: remaining,
            title: `デッキに戻すアーカイブのホロメンを選択（残り${max - i}枚）`,
          });
          if (!picked) break;
          returned.push(picked);
        }
        if (returned.length > 0) {
          for (const c of returned) ctx.removeFromArchive(c);
          ctx.deckToBottom(returned);
          ctx.shuffleDeck();
          ctx.log(`アーカイブのホロメン${returned.length}枚をデッキに戻してシャッフルした`);
        }
      },
    },
  },
};
