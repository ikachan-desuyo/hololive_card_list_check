/**
 * ベスティア・ゼータ (hBP07-017) 白・1st（#ID3期生）
 * ギフト「holoh3ro Shopping」: [センターポジション限定]自分の#ID3期生を持つBuzzホロメンがコラボした時、
 *   自分のステージのホロメン1人を選ぶ。このターンの間、選んだホロメンのアーツ+30。
 *   → triggers.onCollab（ctx.player.collab がコラボしたホロメン）
 * アーツ「みんなと一緒にいる時間が好き」(50): テキスト効果なし。
 */
export default {
  number: 'hBP07-017',
  triggers: {
    *onCollab(ctx) {
      if (ctx.sourceHolomemPos()?.zone !== 'center') return; // [センター限定]
      const collab = ctx.player.collab;
      if (!collab || !collab.stack[0].buzz || !(collab.stack[0].tags || []).includes('ID3期生')) return;
      const target = yield ctx.chooseHolomem({ side: 'self', title: 'このターン アーツ+30するホロメンを選択' });
      if (!target) return;
      const chosen = target.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus', amount: 30, ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターン、${chosen.stack[0].name} のアーツ+30`,
      });
    },
  },
};
