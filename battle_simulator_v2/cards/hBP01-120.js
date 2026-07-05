/**
 * がんも (hBP01-120) サポート・マスコット
 *
 * [サポート効果] このマスコットが付いているホロメンのアーツ+10。
 *   → attached.artsPlus で常時 +10。
 *
 * ◆〈鷹嶺ルイ〉に付いていたら能力追加
 *   このマスコットが付いているホロメンがセンターポジションでアーツを使った時、
 *   自分のデッキを1枚引く。
 *   → triggers.onArtsUse で実装。付け先が〈鷹嶺ルイ〉かつセンターポジションでアーツを使った時、ctx.draw(1)。
 *
 * マスコットは、自分のホロメン1人につき1枚だけ付けられる（マスコット共通ルールで
 *   エンジンが制御するため、ここでは付け先制限を書かない＝任意のホロメンに付けられる）。
 */
export default {
  number: 'hBP01-120',
  attached: {
    // このマスコットが付いているホロメンのアーツ+10
    artsPlus() { return 10; },
  },
  triggers: {
    // ◆〈鷹嶺ルイ〉に付いていたら: ホストがセンターでアーツを使った時、自分のデッキを1枚引く
    * onArtsUse(ctx) {
      const host = ctx.sourceHolomem;
      if (host?.stack[0].name !== '鷹嶺ルイ') return;
      if (ctx.engine._zoneOf(host) !== 'center') return;
      ctx.draw(1);
    },
  },
};
