/**
 * ジジ・ムリン (hBP07-086)
 * コラボエフェクト「執念のチェイサー」: 自分の〈ジジ・ムリン〉1人を選ぶ。このターンの間、選んだホロメンのアーツは、
 *   相手のHPが減っているバックホロメンも対象にできる。
 *   → 選んだホロメンに kind:'artTargetDamagedBack' のターン修正を付与（engine 側で対象拡張）。
 * アーツ「追撃のライオット」: このアーツの対象が、相手のHPが減っているホロメンなら、このアーツ+30。
 *   → dmgBonus（ctx.artTarget.damage > 0 で +30）。
 */
export default {
  number: 'hBP07-086',
  collabEffect: {
    name: '執念のチェイサー',
    *run(ctx) {
      const jiji = ctx.holomems('self', (e) => ctx.nameIs(e.top, 'ジジ・ムリン'));
      if (jiji.length === 0) return;
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.nameIs(e.top, 'ジジ・ムリン'),
        title: 'アーツの対象を拡張する〈ジジ・ムリン〉を選択',
      });
      if (!entry) return;
      const selected = entry.holomem;
      ctx.addTurnModifier({
        kind: 'artTargetDamagedBack',
        ownerIdx: ctx.playerIdx,
        match: (hm) => hm === selected,
        description: `${entry.top.name}のアーツはHPの減った相手バックも対象にできる`,
      });
    },
  },
  arts: {
    '追撃のライオット': {
      dmgBonus(ctx) {
        return ctx.artTarget && ctx.artTarget.damage > 0 ? 30 : 0;
      },
    },
  },
};
