/**
 * AIこより (hBP06-084) 無色・Spot（#秘密結社holoX）
 * ギフト「「こんこよ」、古くなっちゃったかな？」: このホロメンがバトンタッチしてバックポジションに移動した時、
 *   このターンの間、自分のステージの〈博衣こより〉1人のアーツ+20。
 *   → triggers.onBatonMove（バトンタッチでバックへ移動した時に発火。ctx.sourceHolomem=このAIこより）
 * アーツ「「ハッピーリーフ！」」(30): テキスト効果なし。
 */
export default {
  number: 'hBP06-084',
  triggers: {
    *onBatonMove(ctx) {
      const targets = ctx.holomems('self', (e) => e.top.name === '博衣こより');
      if (targets.length === 0) return;
      const target = yield ctx.chooseHolomem({
        side: 'self', filter: (e) => e.top.name === '博衣こより',
        title: 'このターン アーツ+20する〈博衣こより〉を選択',
      });
      if (!target) return;
      const chosen = target.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus', amount: 20, ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターン、${chosen.stack[0].name} のアーツ+20`,
      });
    },
  },
};
