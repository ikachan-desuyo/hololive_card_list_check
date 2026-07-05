/**
 * ムーナ・ホシノヴァ 1st (hBP01-090) 青・HP110（#ID #ID1期生 #歌）
 * ブルームエフェクト「ラピスラズリ」:
 *   自分のエールデッキから、[緑エールか青エール]1枚を公開し、自分のホロメンに送る。
 *   そしてエールデッキをシャッフルする。
 * アーツ「楽しみにしてて！！」(20): 効果テキストなし（通常ダメージのみ）。
 *
 * ※ エールデッキは非公開領域のため、候補（緑/青エール）のみ提示する。
 *   候補がなくても、送り先がいなくても、最後にエールデッキのシャッフルは必ず行う（テキスト通り）。
 */
export default {
  number: 'hBP01-090',
  bloomEffect: {
    name: 'ラピスラズリ',
    *run(ctx) {
      const candidates = ctx.player.cheerDeck.filter(
        (c) => c.color === '緑' || c.color === '青',
      );
      const hasTarget = ctx.holomems('self').length > 0;
      if (candidates.length > 0 && hasTarget) {
        const picked = yield ctx.chooseCard({
          cards: candidates,
          title: 'エールデッキから送る[緑エールか青エール]を選択',
        });
        if (picked) {
          const target = yield ctx.chooseHolomem({
            side: 'self',
            title: 'エールを送る自分のホロメンを選択',
          });
          if (target) {
            ctx.removeFromCheerDeck(picked);
            ctx.log(`${ctx.player.name}: エールデッキから ${picked.name} を公開`);
            ctx.flashReveal(picked);
            ctx.attachCheer(picked, target.holomem);
          }
        }
      }
      ctx.shuffleCheerDeck();
    },
  },
};
