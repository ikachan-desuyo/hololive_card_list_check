/**
 * 水宮枢 (hBP08-047) 青・Debut・HP120（#DEV_IS #FLOW #GLOW）
 * コラボエフェクト「はい、天才！」:
 *   自分が後攻で最初のターンなら、自分のデッキを1枚引き、
 *   相手のセンターホロメンのバトンタッチに必要な無色1つにつき、自分のデッキを1枚引く。
 *   → collabEffect。条件は ctx.isFirstTurnGoingSecond()（後攻＝先攻でない & 自分の最初のターン）。
 *     条件を満たすなら必ず1枚引き、さらに相手センターの実効バトンコスト中の「無色」枚数分を追加で引く。
 *     バトンコストは軽減/増加修正を反映するため engine._effectiveBatonCost を使う（hSD11-009 と同様）。
 *     プレイヤー選択を伴わない純粋なドローのため yield は不要。
 * アーツ「すうの充電たりてる？」(30, blue): 効果テキスト無し（素点のみ）。
 *
 * 保留: なし。
 */
export default {
  number: 'hBP08-047',

  collabEffect: {
    name: 'はい、天才！',
    *run(ctx) {
      if (!ctx.isFirstTurnGoingSecond()) {
        ctx.log('後攻で最初のターンではないため効果なし');
        return;
      }
      // まず1枚引く
      let total = 1;
      // 相手センターのバトンタッチに必要な無色の数だけ追加で引く
      const oppCenter = ctx.opponent.center;
      if (oppCenter) {
        const oppIdx = 1 - ctx.playerIdx;
        const colorless = ctx.engine
          ._effectiveBatonCost(oppCenter, oppCenter.stack[0].batonTouch || [], oppIdx)
          .filter((c) => c === '無色').length;
        total += colorless;
      }
      ctx.draw(total);
    },
  },
};
