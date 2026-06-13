/**
 * こよりの助手くん (hBP04-105) サポート・ファン
 * このファンをホロメンに手札かアーカイブから付けた時、
 *   自分のステージのエール1枚を、このファンが付いているホロメンに付け替えられる。
 * このファンは、自分の〈博衣こより〉だけに付けられ、1人につき何枚でも付けられる。
 */
export default {
  number: 'hBP04-105',
  attachRule: {
    canAttach(holomem) {
      return holomem.stack[0].name === '博衣こより';
    },
    unlimited: true, // 1人に何枚でも
  },
  triggers: {
    // 「付けた時」トリガー（手札/アーカイブどちらから付けても発火。エンジンの supportAttach と
    //  ctx.attachSupportWithTrigger 経由で誘発される）
    *onAttach(ctx) {
      const host = ctx.sourceHolomem; // このファンが付いたホロメン（博衣こより）
      // 付け替え元になれるエール（host 自身のエールは動かす意味がないので除外）
      const entries = [];
      for (const e of ctx.holomems('self')) {
        if (e.holomem === host) continue;
        for (const ch of e.holomem.cheers) entries.push({ ch, from: e.holomem });
      }
      if (entries.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: entries.map((e) => e.ch),
        title: `${host.stack[0].name} に付け替えるエールを選択（任意）`,
        optional: true,
        skipLabel: '付け替えない',
      });
      if (!picked) return;
      const from = entries.find((e) => e.ch === picked).from;
      ctx.moveCheer(picked, from, host);
    },
  },
};
