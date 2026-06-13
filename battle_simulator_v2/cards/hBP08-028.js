/**
 * アキ・ローゼンタール 1st (hBP08-028) 緑・HP170（JP/1期生/ハーフエルフ/お酒/サマー）
 *
 * ブルームエフェクト「ホロナツ大盛りパフェ」:
 *   自分のツールが付いている〈アキ・ローゼンタール〉1人を選ぶ。
 *   このターンの間、選んだホロメンのアーツ+20。
 *   選んだホロメンがBuzzホロメンか2ndホロメンなら、かわりに、そのホロメンのアーツ+50。
 *   → 対象は「ツールが付いている〈アキ・ローゼンタール〉」に限定。候補が無ければ何もしない。
 *     +20/+50 の判定は選んだホロメンの最上段（top）の buzz / bloomLevel==='2nd' で行う。
 *     ターン限定の artsPlus 修正を、選んだホロメン1体だけに付与する（match で identity 一致）。
 *
 * アーツ「一口食べる？」(dmg:50):
 *   自分のツールが付いているホロメン1人のHP30回復。
 *   → 候補（自分のツール付きホロメン）から1人選んで heal 30。候補が無ければ何もしない。
 *
 * 保留: なし。
 */
const hasTool = (e) => e.holomem.attachments.some((a) => a.supportType === 'ツール');

export default {
  number: 'hBP08-028',

  bloomEffect: {
    name: 'ホロナツ大盛りパフェ',
    *run(ctx) {
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.top.name === 'アキ・ローゼンタール' && hasTool(e),
        title: 'アーツを上げる、ツールが付いている〈アキ・ローゼンタール〉を選択',
      });
      if (!target) return;
      const top = target.top;
      const big = top.buzz || top.bloomLevel === '2nd';
      const amount = big ? 50 : 20;
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount,
        ownerIdx: ctx.playerIdx,
        match: (h) => h === target.holomem,
        description: `このターンの間、${top.name}のアーツ+${amount}`,
      });
    },
  },

  arts: {
    '一口食べる？': {
      *run(ctx) {
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: hasTool,
          title: 'HP30回復する、ツールが付いている自分のホロメンを選択',
        });
        if (target) ctx.heal(target.holomem, 30);
      },
    },
  },
};
