/**
 * イヌ (hBP02-096) サポート・マスコット
 *
 * [サポート効果] このマスコットが付いているホロメンのアーツ+10。
 *   → attached.artsPlus で常時 +10。
 *
 * ◆〈沙花叉クロヱ〉に付いていたら能力追加
 *   このマスコットが付いているホロメンが相手のホロメンをダウンさせた時、
 *   自分のアーカイブのエール1枚を、自分の#秘密結社holoXを持つホロメンに送れる。
 *   → 【保留（部分未実装）】「付いているホロメン（ホスト）が相手をダウンさせた時」を
 *      捕捉するトリガー機構がエンジンに無い。engine.js の onOpponentDown 誘発
 *      (_resolvePerformance 内 `this.registry.get(topCard(h).number)?.triggers?.onOpponentDown`)
 *      はダウンさせたホロメン「自身」のカード定義のみを走査し、付いている装着カードの
 *      トリガーは走査しない。装着カードに「ホスト（付いている先）が相手をダウンさせた時」
 *      フックが追加されたら、ここに以下を実装すること:
 *        triggers: { *onOpponentDown(ctx) {
 *          if (ctx.sourceHolomem.stack[0].name !== '沙花叉クロヱ') return;
 *          // 自分のアーカイブのエール1枚を選び、#秘密結社holoX を持つ自ホロメンに送る
 *          // （moveCheer / attachCheer 等で実装）
 *        } }
 *      （沙花叉クロヱ以外に付いている場合はこの能力自体が無いため、判定が必要）
 *
 * マスコットは、自分のホロメン1人につき1枚だけ付けられる（マスコット標準ルール。
 * エンジン側で制限されるため attachRule は不要）。
 */
export default {
  number: 'hBP02-096',
  attached: {
    // このマスコットが付いているホロメンのアーツ+10
    artsPlus() {
      return 10;
    },
  },
};
