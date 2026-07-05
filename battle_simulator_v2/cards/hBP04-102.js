/**
 * やめなー (hBP04-102) サポート・マスコット
 * このマスコットが付いているホロメンのアーツ+10。
 * ◆#5期生を持つ1st以上のホロメンに付いていたら能力追加:
 *   [バックポジション限定]このマスコットが付いているホロメンは相手からダメージを受けない。
 * マスコットは、自分のホロメン1人につき1枚だけ付けられる（エンジン側の装着ルールで担保）。
 *
 * 実装:
 *  - attached.artsPlus で常時アーツ+10。
 *  - attached.damageDelta で、付け先が「#5期生」を持つ 1st以上（=bloomLevel が Debut 以外）かつ
 *    バックポジションにいる時のみ、被ダメージを大きく軽減（-100000）して実質「ダメージを受けない」を表現。
 *    最終ダメージは engine 側で Math.max(0, dmg + delta) にクランプされる。
 *
 * 保留: なし
 */
export default {
  number: 'hBP04-102',
  attached: {
    artsPlus() {
      return 10;
    },
    // holomem=付いているホロメン, zone=その位置, engine, kind, attacker
    damageDelta(holomem, zone) {
      const top = holomem.stack[0];
      const tags = top.tags || [];
      const is5ki = tags.includes('5期生');
      // 「1st以上」= Debut より上（1st / 2nd / Buzz の 1st系）。Debut は対象外。
      const is1stOrAbove = top.bloomLevel && top.bloomLevel !== 'Debut';
      if (is5ki && is1stOrAbove && zone === 'back') {
        return -100000; // バックポジション限定で相手からダメージを受けない
      }
      return 0;
    },
  },
};
