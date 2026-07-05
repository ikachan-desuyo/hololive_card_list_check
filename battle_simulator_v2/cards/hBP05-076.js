/**
 * ちょこのビーフストロガノフ (hBP05-076) サポート・イベント（#食べ物）
 * このターンの間、自分のステージのホロメン1人のアーツ+10。
 * その後、このターンの間、自分のステージの2ndホロメンの〈癒月ちょこ〉1人のアーツ+10。
 */
export default {
  number: 'hBP05-076',
  support: {
    *run(ctx) {
      // ①任意のホロメン1人 +10
      const first = yield ctx.chooseHolomem({ side: 'self', title: 'アーツ+10するホロメンを選択' });
      if (first) {
        const h1 = first.holomem;
        ctx.addTurnModifier({
          kind: 'artsPlus', amount: 10, ownerIdx: ctx.playerIdx,
          match: (h) => h === h1,
          description: `このターン、${h1.stack[0].name} のアーツ+10`,
        });
      }
      // ②2ndの〈癒月ちょこ〉1人 +10（いれば）
      const choco = ctx.holomems('self', (e) => e.top.name === '癒月ちょこ' && e.top.bloomLevel === '2nd');
      if (choco.length === 0) return;
      const second = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.top.name === '癒月ちょこ' && e.top.bloomLevel === '2nd',
        title: 'さらにアーツ+10する2ndの〈癒月ちょこ〉を選択',
        optional: true,
      });
      if (second) {
        const h2 = second.holomem;
        ctx.addTurnModifier({
          kind: 'artsPlus', amount: 10, ownerIdx: ctx.playerIdx,
          match: (h) => h === h2,
          description: `このターン、${h2.stack[0].name} のアーツ+10`,
        });
      }
    },
  },
};
