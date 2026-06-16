/**
 * Otomo (hBP08-107) サポート・ファン
 *
 * [サポート効果]
 *   ■このファンが付いているホロメンのアーツ+10。
 *     → attached.artsPlus（常時+10）。
 *   ◆このファンをホロメンに手札かアーカイブから付けた時、
 *     このファンが付いているホロメンをアクティブにするかお休みさせる。
 *     → triggers.onAttach（手札/アーカイブどちらから付けても誘発）。
 *        「アクティブにするかお休みさせる」=強制効果。どちらにするかはプレイヤーが選ぶ。
 *        アクティブ→ ctx.setActive、お休み→ rested=true（その場でお休み。バックへは動かさない）。
 *
 * 付け先制限:
 *   このファンは、自分の〈セシリア・イマーグリーン〉だけに付けられ、1人につき何枚でも付けられる。
 *
 * ※コンパイラは「常時バフ＋トリガー」型を安全側で枠ごと不採用にする（付け先制限しか残らない）ため、
 *   アーツ+10 と付けた時の効果を実装するには手書きが必要。
 */
export default {
  number: 'hBP08-107',
  attachRule: {
    canAttach: (h) => h.stack[0].name === 'セシリア・イマーグリーン',
    unlimited: true, // 1人に何枚でも
  },
  attached: {
    artsPlus() { return 10; },
  },
  triggers: {
    // 「このファンをホロメンに手札かアーカイブから付けた時」
    *onAttach(ctx) {
      const host = ctx.sourceHolomem; // このファンが付いたホロメン（セシリア・イマーグリーン）
      if (!host) return;
      const active = yield ctx.confirm(
        `${host.stack[0].name} をどちらにしますか？`,
        'アクティブにする', 'お休みさせる');
      if (active) {
        ctx.setActive(host);          // お休みならアクティブに（既にアクティブなら何も起きない）
      } else if (!host.rested) {
        host.rested = true;           // アクティブならお休みに（その場でお休み）
        ctx.log(`${host.stack[0].name} をお休みさせた`);
      }
    },
  },
};
