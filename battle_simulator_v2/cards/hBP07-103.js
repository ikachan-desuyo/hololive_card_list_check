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
 *
 * ※装着先の制限は無い（テキストは「付いている〈桃鈴ねね〉の～」と効果の適用対象を限定しているだけ）。
 *   〈桃鈴ねね〉以外に付けた場合は各修正が発動しないのみ（hBP07-104 Thorn / hBP07-101 ASMRマイクと同型）。
 */
export default {
  number: 'hBP07-103',
  attached: {
    // 付いている〈桃鈴ねね〉のアーツ+20（常時修正）
    artsPlus(holomem, engine) {
      return engine._nameIs(holomem.stack[0], '桃鈴ねね') ? 20 : 0;
    },
    // ◆1st以上の〈桃鈴ねね〉に付いていたら: このホロメンのアーツダメージは軽減されない
    artsDamageNotReduced(holomem, engine) {
      const top = holomem.stack[0];
      return engine._nameIs(top, '桃鈴ねね') && (top.bloomLevel === '1st' || top.bloomLevel === '2nd');
    },
  },
};
