/**
 * ことり (hBP01-121) サポート・マスコット
 *
 * [サポート効果] このマスコットが付いているホロメンがセンターポジションか
 *   コラボポジションで受けるダメージ-10。
 *   → attached.damageDelta（センター/コラボ限定の被ダメージ軽減）で実装。
 *
 * ◆〈小鳥遊キアラ〉に付いていたら能力追加:
 *   このマスコットが付いているホロメンのBloomレベルが上がった時、自分のデッキを1枚引く。
 *   → triggers.onBloom で実装。Bloom後の top が〈小鳥遊キアラ〉で、かつ Bloomレベルが実際に
 *     上がった時（Debut→1st / 1st→2nd。1st→1st の同レベルBloomは除外）のみ draw(1)。
 *     Bloomでは新カードが stack[0]、直前のカードが stack[1] になるので両者のレベルを比較する。
 *
 * マスコットは、自分のホロメン1人につき1枚だけ付けられる（エンジン既定のマスコット制限に従う）。
 */
const BLOOM_RANK = { Debut: 0, '1st': 1, '2nd': 2, Spot: 0 };

export default {
  number: 'hBP01-121',
  attached: {
    // センターポジション・コラボポジションで受けるダメージ-10
    damageDelta(holomem, zone) {
      return zone === 'center' || zone === 'collab' ? -10 : 0;
    },
  },
  triggers: {
    // ◆〈小鳥遊キアラ〉に付いていたら: ホストのBloomレベルが上がった時、デッキを1枚引く
    * onBloom(ctx) {
      const h = ctx.sourceHolomem;
      if (h?.stack[0].name !== '小鳥遊キアラ') return;            // Bloom後の top が〈小鳥遊キアラ〉
      if (h.stack.length < 2) return;
      const now = BLOOM_RANK[h.stack[0].bloomLevel] ?? 0;
      const prev = BLOOM_RANK[h.stack[1].bloomLevel] ?? 0;
      if (now <= prev) return;                                    // レベルが上がった時のみ（同レベルBloomは除外）
      ctx.draw(1);
    },
  },
};
