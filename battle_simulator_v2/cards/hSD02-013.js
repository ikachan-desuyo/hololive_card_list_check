/**
 * 阿修羅＆羅刹 (hSD02-013) サポート・ツール
 *
 * [サポート効果] このツールが付いているホロメンのアーツ+10。
 *   → attached.artsPlus で常時+10。
 *
 * ◆1st以上の〈百鬼あやめ〉に付いていたら能力追加
 *   このツールが付いているホロメンのアーツ+10。（合計+20）
 *   → 付け先の現在のトップカード（stack[0]）が名前〈百鬼あやめ〉かつ
 *     bloomLevel が '1st' または '2nd'（=1st以上）のとき、さらに+10。
 *
 * ツールは、自分のホロメン1人につき1枚だけ付けられる（エンジン既定のツール制限で処理）。
 */
export default {
  number: 'hSD02-013',
  attached: {
    artsPlus(holomem) {
      const top = holomem?.stack?.[0];
      let bonus = 10; // 基本のサポート効果
      // ◆1st以上の〈百鬼あやめ〉に付いていたら追加で+10
      if (top?.name === '百鬼あやめ' && (top.bloomLevel === '1st' || top.bloomLevel === '2nd')) {
        bonus += 10;
      }
      return bonus;
    },
  },
};
