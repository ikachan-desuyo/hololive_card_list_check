/**
 * ラプラス・ダークネス (hBP04-005) 推しホロメン 紫 ライフ5
 *
 * 推しスキル「総帥のお仕事」[ホロパワー：-2][ターンに1回]:
 *   このターンの間、自分のホロメンの能力でサイコロを1度に3回振る時、そのサイコロの目の数すべてを5として扱う。
 *   → oshiSkill（能動）。addTurnModifier({kind:'diceFixed', value:5}) を積む。
 *     context.js の rollDice() が自分(playerIdx)の diceFixed 修正を参照し、振った目を5に置き換える。
 *   ★保留(過剰適用): カードテキストは「1度に3回振る時」限定だが、エンジンの rollDice は
 *     「1度に何回振るか」をコンテキストに持たない（diceFixed は ownerIdx 単位で全ロールに作用する）。
 *     そのため本実装ではこのターンの自分の全てのダイスロールが5固定になる（=テキストより広い）。
 *     1回振り効果（例: 偶数判定）まで5固定になる点が原文との差異。3回ロール限定の判定機構が
 *     入るまではこの近似で運用する。
 *
 * SP推しスキル「我ら秘密結社holoX！」[ホロパワー：-3][ゲームに1回]:
 *   自分の#秘密結社holoXを持つホロメン1人を選ぶ。このターンの間、選んだホロメンのアーツは、
 *   エールを必要とせずに使える。
 *   → spOshiSkill。選んだホロメンに対し、全色＋無色の artCostReduce を大量に積み、
 *     どんなアーツコストも空（=エール0で使用可）になるようにする。
 *     engine._effectiveArtCost → effects.artsCostReduction が kind:'artCostReduce' の
 *     ターン修正を集計する（system.js 参照）。ターン終了で自動消滅。
 */
import { COLORS, COLORLESS } from '../core/constants.js';

export default {
  number: 'hBP04-005',

  // 推しスキル「総帥のお仕事」: このターンの間、自分のダイス目を5として扱う（※過剰適用、上部JSDoc参照）
  oshiSkill: {
    *run(ctx) {
      ctx.addTurnModifier({
        kind: 'diceFixed',
        value: 5,
        ownerIdx: ctx.playerIdx,
        description: 'このターンの間、自分のホロメンの能力で振るサイコロの目をすべて5として扱う',
      });
    },
  },

  // SP推しスキル「我ら秘密結社holoX！」: #秘密結社holoX 1人のアーツをこのターン エール不要で使えるようにする
  spOshiSkill: {
    canUse(engine, idx) {
      const p = engine.state.players[idx];
      return engine._stageHolomems(p).some((h) => (h.stack[0].tags || []).includes('秘密結社holoX'));
    },
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.hasTag(e.top, '秘密結社holoX'),
        title: 'このターン アーツをエール不要で使う#秘密結社holoXホロメンを選択',
      });
      if (!entry) return;
      const chosen = entry.holomem;
      // 全色＋無色のコストを大量軽減して、どんなアーツコストも空にする
      for (const color of [...COLORS, COLORLESS]) {
        ctx.addTurnModifier({
          kind: 'artCostReduce',
          color,
          amount: 99,
          ownerIdx: ctx.playerIdx,
          match: (h) => h === chosen,
          description: `このターンの間、${chosen.stack[0].name} のアーツはエール不要（${color}）`,
        });
      }
      ctx.log(`我ら秘密結社holoX！: ${chosen.stack[0].name} はこのターン、アーツをエールなしで使える`);
    },
  },
};
