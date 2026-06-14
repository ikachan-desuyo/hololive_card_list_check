/**
 * 35P (hBP03-107) サポート・ファン
 *
 * [サポート効果]
 *  ■このファンが付いているホロメンがアーツを使う時、このファンを赤エールとしても扱う。
 *    → attached.cheerSupply で実装（アーツ使用時に赤エール1個を擬似供給）。
 *
 *  ■このファンが付いているホロメンがダウンした時、相手は、自身のデッキを1枚引ける。
 *    → triggers.onDown で実装（装着先ホロメンのダウン時に発火。ctx.playerIdx=このファンの持ち主、
 *      ctx.sourceHolomem=ダウンしたホロメン）。
 *      「相手は…引ける」= 任意の決定を『相手プレイヤー』が行う必要がある。
 *      決定ポイントオブジェクトを直接 yield し player を相手インデックス（1-ctx.playerIdx）にすることで、
 *      決定ポイントの所有者を相手にできる（_stepEffect が request.player を pending.player に使う）。
 *      sibling の hBP05-085（みこだにぇー: 相手が手札をアーカイブ）と同じ機構。
 *      ・引くのは「相手自身のデッキ」→ ctx.opponent.deck から ctx.opponent.hand へ移す。
 *      ・「相手のターンで」等の限定は無い＝どのターンのダウンでも発火する。
 *      ・デッキが空なら何もできない（決定ポイントを出さない）。
 *
 * このファンは、自分の〈さくらみこ〉だけに付けられ、1人につき何枚でも付けられる。
 *    → attachRule で実装。
 */
export default {
  number: 'hBP03-107',
  attached: {
    // ■このファンが付いているホロメンがアーツを使う時、このファンを赤エールとしても扱う（擬似エール供給）
    cheerSupply() { return [{ color: '赤' }]; },
  },
  attachRule: {
    canAttach(holomem) {
      return holomem.stack[0].name === 'さくらみこ';
    },
    unlimited: true, // 1人に何枚でも
  },
  triggers: {
    // ■このファンが付いているホロメンがダウンした時、相手は、自身のデッキを1枚引ける。
    //   「相手は…引ける」= 任意の決定を相手プレイヤーが行う。決定ポイントの所有者を相手にする。
    *onDown(ctx) {
      const opp = ctx.opponent;
      if (opp.deck.length === 0) return; // 引けるカードが無ければ何もできない
      const oppIdx = 1 - ctx.playerIdx;
      const use = yield {
        kind: 'confirm',
        player: oppIdx,
        title: '35P: 自身のデッキを1枚引く？',
        buildOptions: () => [
          { id: 'yes', label: '1枚引く', value: true },
          { id: 'no', label: '引かない', value: false },
        ],
      };
      if (!use) return;
      const c = opp.deck.shift();
      opp.hand.push(c);
      ctx.log(`${opp.name}: 35Pの効果でデッキを1枚引いた`);
    },
  },
};
