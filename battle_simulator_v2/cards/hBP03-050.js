/**
 * FUWAMOCO 1st (hBP03-050) 青赤・HP150（#EN #Advent #ケモミミ）
 * アーツ「魔界乃番犬シスターズ」(40):
 *   自分のエールデッキから、[赤エールか青エール]1枚を公開し、
 *   自分の#Adventを持つホロメンに送る。そしてエールデッキをシャッフルする。
 * アーツ「2人揃ってFUWAMOCOです！」(60): 効果テキストなし（通常ダメージのみ）。
 */
export default {
  number: 'hBP03-050',
  arts: {
    '魔界乃番犬シスターズ': {
      *run(ctx) {
        // エールデッキ内の赤エール・青エールを抽出（非公開領域なので候補のみ提示）
        const candidates = ctx.player.cheerDeck.filter(
          (c) => c.color === '赤' || c.color === '青',
        );
        // #Adventを持つ自分のホロメンが送り先（いなければ送れない）
        const hasAdventTarget = ctx.holomems('self', (e) => ctx.hasTag(e.top, 'Advent')).length > 0;
        if (candidates.length > 0 && hasAdventTarget) {
          const picked = yield ctx.chooseCard({
            cards: candidates,
            title: 'エールデッキから送る[赤エールか青エール]を選択',
          });
          if (picked) {
            const target = yield ctx.chooseHolomem({
              side: 'self',
              filter: (e) => ctx.hasTag(e.top, 'Advent'),
              title: 'エールを送る#Adventホロメンを選択',
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
  },
};
