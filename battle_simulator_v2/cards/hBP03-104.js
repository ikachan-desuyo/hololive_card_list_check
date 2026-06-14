/**
 * Riscot (hBP03-104) サポート・マスコット
 *
 * [サポート効果] このマスコットが付いているホロメンのアーツ+10。
 *   → attached.artsPlus で常時 +10。
 *
 * ◆〈アユンダ・リス〉に付いていたら能力追加:
 *   このマスコットが付いているホロメンがコラボした時、自分のステージのエール1枚を、
 *   このホロメンに付け替えられる。
 *   → triggers.onCollab で実装。自分のステージの任意のエール1枚を選び、ホストへ ctx.moveCheer で付け替え（任意）。
 *
 * マスコットは、自分のホロメン1人につき1枚だけ付けられる
 *   （エンジン既定のマスコット制限で処理されるため attachRule 不要）。
 */
export default {
  number: 'hBP03-104',
  attached: {
    // [サポート効果] 付いているホロメンのアーツ+10
    artsPlus() { return 10; },
  },
  triggers: {
    // ◆〈アユンダ・リス〉に付いていたら: ホストがコラボした時、自分のステージのエール1枚をこのホロメンに付け替えられる（任意）
    * onCollab(ctx) {
      const host = ctx.sourceHolomem;
      if (host?.stack[0].name !== 'アユンダ・リス') return;
      const all = [];
      for (const e of ctx.holomems('self')) {
        for (const ch of e.holomem.cheers) all.push({ cheer: ch, from: e.holomem });
      }
      if (all.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: all.map((x) => x.cheer),
        title: 'このホロメンに付け替えるエールを選択（自分のステージ・任意）',
        optional: true,
      });
      if (!picked) return;
      const entry = all.find((x) => x.cheer === picked);
      if (entry && entry.from !== host) ctx.moveCheer(picked, entry.from, host);
    },
  },
};
