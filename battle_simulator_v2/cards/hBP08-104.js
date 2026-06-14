/**
 * けはい (hBP08-104) サポート・ツール
 *
 * [サポート効果]
 * ◆〈水宮枢〉に付いていたら能力追加:
 *   ■[センターポジション・コラボポジション限定]相手のセンターホロメンのバトンタッチに必要な無色+1。
 *   ■このホロメンのBloomレベルが上がった時、自分のデッキを1枚引く。
 * ツールは、自分のホロメン1人につき1枚だけ付けられる
 *   （ツール1人1枚の上限はエンジンの _canAttachSupport が既定で処理。付け先制限は無いので attachRule 不要）。
 *
 * 実装メモ:
 * - 「Bloomレベルが上がった時、自分のデッキを1枚引く」は triggers.onBloom（このツールが付いた
 *   ホロメンがBloomした時に engine が発火）。ホストが〈水宮枢〉のときだけ能力が追加されるので、
 *   ctx.sourceHolomem の最上段カード名で判定する。ホロメンは1ターン1回しかBloomできないため
 *   「Bloomレベルが上がった時」は自然に満たされる。
 *
 *   「相手のセンターのバトンタッチに必要な無色+1」は oppBatonCostDelta（相手側の常時アウラとして
 *   effects.batonCostReduction が盤面を走査して評価。負の軽減量＝コスト増）で実装。
 *   ホスト〈水宮枢〉が前衛(センター/コラボ)に居る間、相手のセンターのバトン必要無色を+1する。
 */
export default {
  number: 'hBP08-104',
  triggers: {
    *onBloom(ctx) {
      const host = ctx.sourceHolomem; // このツールが付いた（Bloomした）ホロメン
      const top = host?.stack?.[0];
      if (!top) return;
      // ◆〈水宮枢〉に付いていたら能力追加
      if (top.name !== '水宮枢') return;
      ctx.draw(1);
    },
  },
  // ◆〈水宮枢〉に付いていたら: [前衛限定]相手のセンターのバトンタッチに必要な無色+1（軽減-1＝増加）
  // src=このツールが付いたホスト, target=バトンタッチしようとしている相手ホロメン
  oppBatonCostDelta(src, target, engine) {
    if (src.stack[0].name !== '水宮枢') return [];          // ホストが〈水宮枢〉
    const sz = engine._zoneOf(src);
    if (sz !== 'center' && sz !== 'collab') return [];       // [センター・コラボ限定]
    if (engine._zoneOf(target) !== 'center') return [];      // 相手のセンターのバトンのみ
    return [{ color: '無色', amount: -1 }];
  },
};
