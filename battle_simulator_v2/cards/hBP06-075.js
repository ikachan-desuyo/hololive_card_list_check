/**
 * 夏色まつり 1st (hBP06-075) 黄・HP160（#JP #1期生 #シューター）
 * アーツ「今夜はdance the night!」(50): 効果なし。
 * アーツ「ダンスレッスン頑張るぞ！」(80+):
 *   自分のステージの[マスコットとファン]1枚につき、サイコロを1回振る。
 *   4以上が出た回数1回につき、このアーツ+10。ただし、振れる回数は4回まで。
 */
const COUNT_TYPES = ['マスコット', 'ファン'];

export default {
  number: 'hBP06-075',
  arts: {
    'ダンスレッスン頑張るぞ！': {
      *run(ctx) {
        // 自分のステージのマスコットとファンの枚数を数える
        let count = 0;
        for (const { holomem } of ctx.holomems('self')) {
          count += holomem.attachments.filter((a) => COUNT_TYPES.includes(a.supportType)).length;
        }
        // 振れる回数は4回まで
        const rolls = Math.min(count, 4);
        if (rolls === 0) return;
        let hits = 0;
        for (let i = 0; i < rolls; i++) {
          if (ctx.rollDice() >= 4) hits++;
        }
        if (hits > 0) ctx.addArtBonus(hits * 10, `4以上${hits}回`);
      },
    },
  },
};
