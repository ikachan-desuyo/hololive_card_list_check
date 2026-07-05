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
 * 実装済み（旧保留解消）:
 *   - 以前はエンジンの onOpponentDown ディスパッチが「アーツを使ったホロメンのトップカード」
 *     （topCard(h)）の triggers.onOpponentDown しか発火せず、装着カード（ツール）の
 *     triggers.onOpponentDown は走査していなかったため保留していた。
 *     現在は engine.js _resolvePerformance がホストの h.attachments を走査して
 *     装着カードの onOpponentDown も発火する（ctx.sourceHolomem=ホスト, ctx.sourceCard=このツール。
 *     hBP02-096 と同方式の配線）。これにより下記トリガーがそのまま機能する。
 *   - ホスト判定は ctx.sourceHolomem.stack[0].buzz（cards.js が Buzzホロメンに付与する buzz フラグ）で行う。
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
