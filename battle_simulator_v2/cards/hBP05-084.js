/**
 * 角巻わためのハープ (hBP05-084) サポート・ツール
 *
 * テキスト:
 *   このツールが付いているホロメンのアーツ+10。
 *   ◆2nd以上の〈角巻わため〉に付いていたら能力追加:
 *     ■自分のステージに〈わためいと〉がある間、このツールが付いているホロメンのアーツ+10。
 *     ■このツールが付いているホロメンがアーツを使った時、自分のアーカイブのエール1枚を
 *       自分の〈角巻わため〉に送れる。
 *   ツールは、自分のホロメン1人につき1枚だけ付けられる（エンジンの装着ルールで担保）。
 *
 * 実装:
 *  - attached.artsPlus で常時アーツ+10。
 *    付け先が「2nd の〈角巻わため〉」のときは追加判定を行い、自分のステージに〈わためいと〉
 *    （＝いずれかの自分ホロメンに付いたファン）が1枚でもあれば さらに +10（合計+20）。
 *    「2nd以上」= このゲームの最大ブルームレベルが 2nd のため bloomLevel === '2nd' で判定。
 *
 * 保留:
 *  - 「このツールが付いているホロメンがアーツを使った時、自分のアーカイブのエール1枚を
 *     自分の〈角巻わため〉に送れる」部分。
 *     エンジンの onArtsUse トリガーはアーツを使ったホロメン自身(topCard)のカードしか
 *     発火させず、装着カード（ツール）の triggers.onArtsUse を拾う経路が現状ない
 *     （engine.js の afterAllDamage 内 onArtsUse 走査が装着を含まない）ため未実装。
 *     装着カードのアーツ使用時トリガーをエンジンがサポートしたら triggers.onArtsUse で実装可。
 */
export default {
  number: 'hBP05-084',
  attached: {
    artsPlus(holomem, engine) {
      let plus = 10; // 常時アーツ+10
      const top = holomem.stack[0];
      // ◆2nd以上の〈角巻わため〉に付いていたら能力追加
      if (top.name === '角巻わため' && top.bloomLevel === '2nd') {
        // 付け先（＝このツールが付いているホロメン）の持ち主を特定し、その自分ステージを見る
        const owner = engine.state.players.find(
          (p) => engine._stageHolomems(p).includes(holomem));
        if (owner) {
          // 自分のステージに〈わためいと〉がある間（いずれかの自分ホロメンに付いたファン）
          const hasWatameito = engine._stageHolomems(owner).some(
            (h) => (h.attachments || []).some((a) => a.name === 'わためいと'));
          if (hasWatameito) plus += 10;
        }
      }
      return plus;
    },
  },
};
