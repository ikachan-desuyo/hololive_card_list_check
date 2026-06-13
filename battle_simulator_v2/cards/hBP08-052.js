/**
 * 水宮枢 (hBP08-052) 青・2nd・HP210（#DEV_IS #FLOW #GLOW）
 *
 * [アーツ] 元気の出るグミ (70, blue / 特攻:赤+50):
 *   相手のセンターホロメンのバトンタッチに必要な無色が5つ以上なら、
 *   自分のエールデッキの上から1枚を自分の〈水宮枢〉に送る。
 *   → ダメージ適用後に *run で処理。相手センターの実効バトンコスト中の「無色」枚数を
 *     engine._effectiveBatonCost で数え（軽減/増加修正を反映。hBP08-047 と同じ手法）、
 *     5つ以上なら自分の〈水宮枢〉に sendCheerFromCheerDeckTop で1枚送る。
 *     送り先が複数いる場合はプレイヤーが選択する。
 *
 * [アーツ] グミうまい (180, blue/any/any/any / 特攻:赤+50): 効果テキスト無し（素点のみ）。
 *
 * 保留: なし。
 */
export default {
  number: 'hBP08-052',

  arts: {
    '元気の出るグミ': {
      *run(ctx) {
        const oppCenter = ctx.opponent.center;
        if (!oppCenter) return;
        const oppIdx = 1 - ctx.playerIdx;
        const colorless = ctx.engine
          ._effectiveBatonCost(oppCenter, oppCenter.stack[0].batonTouch || [], oppIdx)
          .filter((c) => c === '無色').length;
        if (colorless < 5) {
          ctx.log('相手センターのバトンタッチに必要な無色が5つ未満のため効果なし');
          return;
        }
        if (ctx.player.cheerDeck.length === 0) return;
        const targets = ctx.holomems('self', (e) => e.top.name === '水宮枢');
        if (targets.length === 0) return;
        let chosen;
        if (targets.length === 1) {
          chosen = targets[0];
        } else {
          chosen = yield ctx.chooseHolomem({
            side: 'self',
            filter: (e) => e.top.name === '水宮枢',
            title: 'エールデッキの上から1枚を送る〈水宮枢〉を選択',
          });
        }
        if (!chosen) return;
        ctx.sendCheerFromCheerDeckTop(chosen.holomem);
      },
    },
  },
};
