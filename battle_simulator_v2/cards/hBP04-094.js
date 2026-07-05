/**
 * まいたけダンス (hBP04-094) サポート・イベント
 * 自分の〈儒烏風亭らでん〉1人を選ぶ。自分のステージのエール1～2枚を、選んだホロメンに
 * 付け替えられる。その後、選んだホロメンにエールが3枚以上付いている時、
 * このターンの間、選んだホロメンのアーツ+10。
 */
export default {
  number: 'hBP04-094',
  support: {
    canUse(ctx) {
      return ctx.holomems('self', (e) => e.top.name === '儒烏風亭らでん').length > 0;
    },
    *run(ctx) {
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.top.name === '儒烏風亭らでん',
        title: '〈儒烏風亭らでん〉を選択',
      });
      if (!target) return;
      const raden = target.holomem;
      for (let i = 0; i < 2; i++) {
        const entries = [];
        for (const e of ctx.holomems('self')) {
          if (e.holomem === raden) continue;
          for (const ch of e.holomem.cheers) entries.push({ ch, from: e.holomem });
        }
        if (entries.length === 0) break;
        const picked = yield ctx.chooseCard({
          cards: entries.map((e) => e.ch),
          title: `${raden.stack[0].name} に付け替えるエールを選択（${i + 1}/2・任意）`,
          optional: true, skipLabel: '終了する',
        });
        if (!picked) break;
        const from = entries.find((e) => e.ch === picked).from;
        ctx.moveCheer(picked, from, raden);
      }
      if (raden.cheers.length >= 3) {
        ctx.addTurnModifier({
          kind: 'artsPlus', amount: 10, ownerIdx: ctx.playerIdx,
          match: (h) => h === raden,
          description: `このターンの間、${raden.stack[0].name} のアーツ+10`,
        });
      }
    },
  },
};
