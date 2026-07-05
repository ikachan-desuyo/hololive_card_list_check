/**
 * セシリア・イマーグリーン (hBP04-031) 緑
 * ギフト「海を越えたお茶会」:
 *   相手のステージに[#JPか#ID]を持つホロメンがいる間、このホロメンのアーツ+30。
 *   → アーツの dmgBonus として実装（このカードのアーツは「マルチリンガル」1つ）
 * アーツ「マルチリンガル」(80):
 *   自分の#語学を持つバックホロメン1人を選ぶ。自分のエールデッキから、選んだホロメンと同色の
 *   エール1枚を公開し、選んだホロメンに送る。そしてエールデッキをシャッフルする。
 */
export default {
  number: 'hBP04-031',
  arts: {
    'マルチリンガル': {
      dmgBonus(ctx) {
        const oppHasJPID = ctx.holomems('opp', (e) =>
          ctx.hasTag(e.top, 'JP') || ctx.hasTag(e.top, 'ID')).length > 0;
        return oppHasJPID ? 30 : 0;
      },
      *run(ctx) {
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => e.pos.zone === 'back' && ctx.hasTag(e.top, '語学'),
          title: '#語学 のバックホロメンを選択',
        });
        if (!target) return;
        const color = target.top.color;
        const cand = ctx.player.cheerDeck.filter((c) => c.color === color);
        const picked = yield ctx.chooseCard({
          cards: cand,
          title: `${color}エールを選択（エールデッキ）`,
          optional: true,
          skipLabel: '見つからなかったことにする',
        });
        if (picked) {
          ctx.removeFromCheerDeck(picked);
          ctx.log(`${ctx.player.name}: エールデッキから ${picked.name} を公開`);
          ctx.flashReveal(picked);
          ctx.attachCheer(picked, target.holomem);
        }
        ctx.shuffleCheerDeck();
      },
    },
  },
};
