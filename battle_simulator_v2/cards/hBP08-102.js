/**
 * クールなパーカー (hBP08-102) サポート・ツール（Buzzグッズ）
 *
 * [サポート効果]
 *   ■このツールが付いているホロメンのアーツ+10。
 *   ◆Buzzホロメンに付いていたら能力追加:
 *     [ターンに1回]このホロメンが相手のホロメンをダウンさせた時、自分のデッキを2枚引く。
 *   ツールは、自分のホロメン1人につき1枚だけ付けられる（エンジン既定のツール制限で担保）。
 *
 * 実装方針:
 *   - アーツ+10は attached.artsPlus で常時修正として実装（全ホロメンに対して+10）。
 *   - Buzz付与時の追加能力「相手をダウンさせた時にデッキを2枚引く（ターンに1回）」は
 *     triggers.onOpponentDown として記述し、付け先がBuzzホロメンの時のみ発火・ターン1回制限を入れている。
 *
 * 保留:
 *   - 現状エンジンの onOpponentDown ディスパッチは「アーツを使ったホロメンのトップカード」
 *     （topCard(h)）の triggers.onOpponentDown のみを発火し、装着カード（ツール）の
 *     triggers.onOpponentDown は走査していない（engine.js _resolvePerformance 内 line~1224。
 *     hBP03-102 の onCollab 未配線と同種の制限）。
 *     そのため本ツールの「2枚引く」は現時点では実際には発火しない。
 *     装着カードの onOpponentDown 通知が配線されれば、下記トリガーがそのまま機能する。
 */
export default {
  number: 'hBP08-102',

  attached: {
    artsPlus() { return 10; }, // このツールが付いているホロメンのアーツ+10
  },

  triggers: {
    // ◆Buzzホロメンに付いていたら: [ターンに1回] このホロメンが相手をダウンさせた時、デッキを2枚引く
    *onOpponentDown(ctx) {
      const host = ctx.sourceHolomem?.stack?.[0];
      if (!host || !host.buzz) return; // Buzzホロメンに付いている時のみ追加能力が有効
      const key = 'hBP08-102:onOpponentDownDraw';
      if (ctx.oncePerTurnUsed(key)) return; // [ターンに1回]
      ctx.markOncePerTurn(key);
      ctx.draw(2);
      ctx.log('クールなパーカー: 相手をダウンさせたのでデッキを2枚引いた');
    },
  },
};
