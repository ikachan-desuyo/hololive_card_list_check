/**
 * 一伊那尓栖 (hBP08-006) 推しホロメン・紫・ライフ5
 *
 * 推しスキル「Ina'nisの色彩」[ホロパワー：-X][ターンに1回]:
 *   この能力でアーカイブしたホロパワー1枚につき、相手のステージのホロメン1人を選ぶ。
 *   このターンの間、選んだホロメンは、すべての色を持つホロメンとして扱う。
 *   → メインステップの能動推しスキル（oshiSkill）。Xコスト対応済み。
 *
 * Xコスト: エンジンが [ホロパワー：-X] の推しスキルに対応済み（engine の oshiSkill 実行で
 *   支払うホロパワー枚数を1枚ずつ選ばせ、その枚数を ctx.payX に渡す）。本 run は ctx.payX を読む。
 *
 * 「すべての色を持つホロメンとして扱う」: kind:'treatedAllColors' のターン修正を付与する。
 *   エンジンの特攻判定（engine._isTreatedAllColors）がこの修正を読み、対象を全色扱いにする。
 */
import { COLORS, COLORLESS } from '../core/constants.js';

export default {
  number: 'hBP08-006',

  // 推しステージスキル「WORLD DOMINATION」:
  //   相手のステージのホロメン全員が、相手の推しホロメンと異なる色を持つなら、
  //   自分の〈一伊那尓栖〉全員のアーツは、エールを必要とせずに使える（常時・条件付き）。
  oshiStageSkill: {
    name: 'WORLD DOMINATION',
    artsCostReduce(holomem, engine, ownerIdx) {
      if (holomem.stack[0].name !== '一伊那尓栖') return [];
      const opp = engine.state.players[1 - ownerIdx];
      const oppHolos = engine._stageHolomems(opp);
      if (oppHolos.length === 0) return []; // 相手にホロメンがいなければ条件不成立
      const oppOshiColor = opp.oshi?.color || null; // 「相手の推しホロメン」の色
      // 相手のステージのホロメン全員が、相手の推しと異なる色（全色扱いなら「異なる色を持つ」＝成立）
      const allDiffer = oppHolos.every((h) => engine._isTreatedAllColors(h) || h.stack[0].color !== oppOshiColor);
      if (!allDiffer) return [];
      // エール不要＝全色＋無色を大量に軽減
      return [...COLORS, COLORLESS].map((c) => ({ color: c, amount: 99 }));
    },
  },

  oshiSkill: {
    name: 'Ina\'nisの色彩',
    canUse(engine, ownerIdx) {
      const opp = engine.state.players[1 - ownerIdx];
      const me = engine.state.players[ownerIdx];
      // 相手のステージにホロメンがいて、ホロパワーを1枚以上払えること
      return engine._stageHolomems(opp).length > 0 && me.holoPower.length > 0;
    },
    *run(ctx) {
      // 支払ったホロパワー枚数 N（engine の X コスト処理が ctx.payX に渡す）
      const n = ctx.payX || 0;
      if (n <= 0) return;
      const chosen = [];
      for (let i = 0; i < n; i++) {
        // 既に選んだホロメンは除外（「1枚につき1人を選ぶ」＝重複なし）
        if (ctx.holomems('opp', (e) => !chosen.includes(e.holomem)).length === 0) break;
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => !chosen.includes(e.holomem),
          title: `すべての色として扱う相手ホロメンを選ぶ（${i + 1}/${n}）`,
        });
        if (!target) break;
        chosen.push(target.holomem);
        // 特攻判定（engine._isTreatedAllColors）が読むターン修正。選んだホロメンを全色扱いにする
        ctx.addTurnModifier({
          kind: 'treatedAllColors',
          ownerIdx: ctx.playerIdx,
          match: (h) => h === target.holomem,
          description: `このターン、${target.top.name} はすべての色を持つホロメンとして扱う`,
        });
      }
    },
  },
};
