/**
 * ギラファノコギリクワガタ (hBP07-103) サポート・ツール
 *
 * [サポート効果] このツールが付いている〈桃鈴ねね〉のアーツ+20。
 *   → attached.artsPlus で実装（常時修正）。
 *
 * ◆1st以上の〈桃鈴ねね〉に付いていたら能力追加
 *   このホロメンのアーツダメージは軽減されない。
 *   → attached.artsDamageNotReduced で実装。engine のアーツダメージ適用時に、付け先が1st以上の
 *     〈桃鈴ねね〉なら相手の軽減（負の被ダメージ修正）を無効化する。
 *
 * ツールは、自分のホロメン1人につき1枚だけ付けられる。
 *   → 既定のツール制限（engine._canAttachSupport がツールの重複付けを禁止）に従う。
 *      attachRule では付け先を〈桃鈴ねね〉に限定するのみ。
 */
export default {
  number: 'hBP07-103',
  attachRule: {
    canAttach(holomem) {
      return holomem.stack[0].name === '桃鈴ねね';
    },
    // unlimited は指定しない → 既定のツール重複禁止（1人につき1枚）が適用される
  },
  attached: {
    // 付いている〈桃鈴ねね〉のアーツ+20（常時修正）
    artsPlus(holomem, _engine) {
      return holomem.stack[0].name === '桃鈴ねね' ? 20 : 0;
    },
    // ◆1st以上の〈桃鈴ねね〉に付いていたら: このホロメンのアーツダメージは軽減されない
    artsDamageNotReduced(holomem) {
      const top = holomem.stack[0];
      return top.name === '桃鈴ねね' && (top.bloomLevel === '1st' || top.bloomLevel === '2nd');
    },
  },
};
