/**
 * 赤井はあと (hBP07-041) 赤・2nd・HP200（#JP #1期生 #料理）
 * コラボエフェクト「EVERYBODY SAY HENTAI」:
 *   相手のコラボホロメンに特殊ダメージ50を与える。
 * アーツ「万物に愛されちゃま計画」(80+):
 *   自分のステージのエールすべてが赤エールなら、このアーツ+20。
 */
export default {
  number: 'hBP07-041',
  collabEffect: {
    name: 'EVERYBODY SAY HENTAI',
    *run(ctx) {
      const collab = ctx.holomems('opp', (e) => e.pos.zone === 'collab');
      if (collab.length === 0) return; // 相手にコラボホロメンがいなければ何もしない
      ctx.dealSpecialDamage(collab[0], 50);
    },
  },
  arts: {
    '万物に愛されちゃま計画': {
      dmgBonus(ctx) {
        // 自分のステージのエールすべてが赤エールなら +20（エールが1枚以上ある前提）
        let count = 0;
        let allRed = true;
        for (const { holomem } of ctx.holomems('self')) {
          for (const cheer of holomem.cheers) {
            count++;
            if (cheer.color !== '赤') allRed = false;
          }
        }
        return count > 0 && allRed ? 20 : 0;
      },
    },
  },
};
