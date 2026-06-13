/**
 * Ruffians (hBP03-109) サポート・ファン
 *
 * [サポート効果] 相手のターンで、このファンが付いているホロメンがダウンした時、
 *   自分のアーカイブの青エール1枚を、自分の〈フワワ・アビスガード〉に送れる。
 *   → triggers.onDown（相手ターン限定）。
 *      engine._processDown はダウンしたホロメン本体＋付いている装着カードの onDown を、
 *      アーカイブ前に sourceHolomem=ダウンしたホロメン で発火させる。
 *      よって付け先（フワワ/モココ）がダウンした瞬間にこのファンの onDown が走る。
 *      「青エール1枚を自分の〈フワワ・アビスガード〉に送れる」= 任意（0可）。送り先は
 *      ステージ上の〈フワワ・アビスガード〉を選ぶ（複数いれば選択。いなければ何もしない）。
 *      ※ダウンしたホロメン自身がフワワ・アビスガードでも、この時点ではまだステージ上に
 *        存在する（アーカイブ前）ため送り先候補に含まれうるが、選ぶかはプレイヤーの判断。
 *
 * このファンは、自分の〈フワワ・アビスガード〉か〈モココ・アビスガード〉だけに付けられ、
 *   1人につき何枚でも付けられる。→ attachRule.canAttach + unlimited。
 */
const HOSTS = ['フワワ・アビスガード', 'モココ・アビスガード'];

export default {
  number: 'hBP03-109',
  attachRule: {
    canAttach(holomem) {
      return HOSTS.includes(holomem.stack[0].name);
    },
    unlimited: true, // 1人に何枚でも
  },
  triggers: {
    *onDown(ctx) {
      if (ctx.state.turnPlayer === ctx.playerIdx) return; // 相手のターンのみ
      // 自分のアーカイブの青エール
      const blueCheers = ctx.player.archive.filter(
        (c) => c.kind === 'cheer' && c.color === '青');
      if (blueCheers.length === 0) return;
      // 送り先: 自分の〈フワワ・アビスガード〉
      const targets = ctx.holomems('self', (e) => e.top.name === 'フワワ・アビスガード');
      if (targets.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: blueCheers,
        title: '〈フワワ・アビスガード〉に送る青エールを選択（任意）',
        optional: true,
        skipLabel: '送らない',
      });
      if (!picked) return;
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.top.name === 'フワワ・アビスガード',
        title: '青エールを送る〈フワワ・アビスガード〉を選択',
      });
      if (!target) return;
      ctx.removeFromArchive(picked);
      ctx.attachCheer(picked, target.holomem);
    },
  },
};
