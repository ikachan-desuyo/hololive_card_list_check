/**
 * ツートンカラーパソコン (hBP04-089) サポート・アイテム・LIMITED
 * このカードは、自分のステージに色が1色で異なる色のホロメンが2人以上いなければ使えない。
 * 自分のステージの色が1色で異なる色のホロメン2人を選ぶ。
 * 自分のデッキから、Buzz以外のそれぞれ選んだホロメンと同色の1stホロメン1枚ずつを
 * 公開し、手札に加える。そしてデッキをシャッフルする。
 * LIMITED：ターンに1枚しか使えない。
 */
import { COLORS } from '../core/constants.js';

// 色が1色（白緑赤青紫黄のいずれか単色。無色・多色は除く）のホロメンか
const isSingleColor = (entry) => COLORS.includes(entry.top.color);

// ステージ上の単色ホロメンの色一覧（重複なし）
function singleColorsOnStage(engine, player) {
  const colors = new Set();
  for (const pos of engine._stagePositions(player)) {
    const col = engine._holomemAt(player, pos).stack[0].color;
    if (COLORS.includes(col)) colors.add(col);
  }
  return [...colors];
}

export default {
  number: 'hBP04-089',
  ai: {
    // ステージ上の単色ホロメンの色が2色以上あり、その色の1stがデッキに残っている時に価値
    supportValue({ engine, player }) {
      const colors = singleColorsOnStage(engine, player);
      if (colors.length < 2) return 0;
      const hits = colors.filter((col) => player.deck.some((c) =>
        c.kind === 'holomen' && c.bloomLevel === '1st' && !c.buzz && c.color === col)).length;
      return hits > 0 ? 28 + hits * 4 : 0;
    },
  },
  support: {
    canUse(ctx) {
      // 単色ホロメンの異なる色が2色以上あれば「異なる色のホロメン2人」を選べる
      const colors = new Set(ctx.holomems('self').filter(isSingleColor).map((e) => e.top.color));
      return colors.size >= 2;
    },
    *run(ctx) {
      const first = yield ctx.chooseHolomem({
        side: 'self',
        filter: isSingleColor,
        title: '1人目（単色ホロメン）を選択',
      });
      if (!first) return;
      const second = yield ctx.chooseHolomem({
        side: 'self',
        // 1人目と異なる色の単色ホロメン
        filter: (e) => isSingleColor(e) && e.top.color !== first.top.color,
        title: '2人目（1人目と異なる色の単色ホロメン）を選択',
      });
      if (!second) return;

      // それぞれと同色のBuzz以外の1stホロメンを1枚ずつサーチ
      for (const entry of [first, second]) {
        const candidates = ctx.deckCards((c) =>
          c.kind === 'holomen' && c.bloomLevel === '1st' && !c.buzz && c.color === entry.top.color);
        const picked = yield ctx.chooseCard({
          cards: candidates,
          title: `手札に加える${entry.top.color}の1stホロメンを選択`,
          optional: true,
          skipLabel: '見つからなかったことにする',
        });
        if (picked) {
          ctx.removeFromDeck(picked);
          ctx.addToHand(picked);
        }
      }
      ctx.shuffleDeck();
    },
  },
};
