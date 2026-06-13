/**
 * ホロスパークリング (hBP02-086) サポート・ツール
 *
 * [サポート効果]
 *   ■このツールが付いているホロメンのアーツ+20。
 *     → attached.artsPlus で常時 +20。
 *   ■このツールが付いている #お酒 を持たないホロメンが受けるダメージ+10。
 *     → attached.damageDelta で、付いているホロメンが #お酒 タグを持たない場合のみ +10。
 *
 * ツールは、自分のホロメン1人につき1枚だけ付けられる（ツール標準ルール。エンジン側で制限されるため
 * attachRule は不要）。
 */
export default {
  number: 'hBP02-086',
  attached: {
    // このツールが付いているホロメンのアーツ+20
    artsPlus() {
      return 20;
    },
    // #お酒 を持たないホロメンが受けるダメージ+10（#お酒 を持つなら 0）
    damageDelta(holomem) {
      const tags = holomem.stack[0].tags || [];
      return tags.includes('お酒') ? 0 : 10;
    },
  },
};
