/**
 * 一伊那尓栖 (hBP08-006) 推しホロメン・紫・ライフ5
 *
 * 推しスキル「Ina'nisの色彩」[ホロパワー：-X][ターンに1回]:
 *   この能力でアーカイブしたホロパワー1枚につき、相手のステージのホロメン1人を選ぶ。
 *   このターンの間、選んだホロメンは、すべての色を持つホロメンとして扱う。
 *   → メインステップの能動推しスキル（oshiSkill）。
 *
 * 【保留1（最重要）: Xコスト未対応】
 *   このスキルのコストは [ホロパワー：-X]（任意枚数）だが、現状エンジンは
 *   X コストの推しスキルをメインステップの選択肢に出さない
 *   （core/engine.js: `if (skill.cost === 'X') return; // X コストは未対応`）。
 *   そのため、本 run はエンジンから呼ばれる経路がまだ無い。
 *   エンジンが X コスト（支払い枚数 N の選択 → ホロパワー N 枚アーカイブ →
 *   その N を run に渡す）に対応した時点で、下記 run が機能する想定で書いてある。
 *   支払い枚数 N は ctx.payX（仮の受け渡し口）から読む。無い場合は 0 として安全側に倒す。
 *
 * 【保留2: 「すべての色を持つホロメンとして扱う」消費側が未実装】
 *   選んだ相手ホロメンを全色扱いにする継続効果は、主に相手の被特攻判定
 *   （engine.js のダメージ計算 `if (tCard.color === tk.color)`）で意味を持つが、
 *   エンジンの色参照は装着カードの静的 color を直接読んでおり、
 *   「実効色」を差し込むフックがまだ無い。
 *   ここでは意図を残すため kind:'treatedAllColors' のターン修正を積むが、
 *   現状この修正を読む消費側コードは無く、実効果は発生しない（inert）。
 *   エンジンの特攻判定を実効色参照（modifiers の treatedAllColors を見る）に
 *   置き換えた時点で機能する。
 *
 * 上記2点が解消されるまで、本ファイルは「選択フローと継続効果の付与」までを
 * 安全側で用意した枠であり、ゲーム上の効果は発生しない。
 */
export default {
  number: 'hBP08-006',

  oshiSkill: {
    name: 'Ina\'nisの色彩',
    canUse(engine, ownerIdx) {
      const opp = engine.state.players[1 - ownerIdx];
      const me = engine.state.players[ownerIdx];
      // 相手のステージにホロメンがいて、ホロパワーを1枚以上払えること
      return engine._stageHolomems(opp).length > 0 && me.holoPower.length > 0;
    },
    *run(ctx) {
      // 保留1: エンジンが X コスト対応後、支払い枚数 N を渡してくる想定。
      // 現状は受け取り口が無いため 0（＝何も起きない安全側）。
      const n = ctx.payX || 0;
      if (n <= 0) {
        ctx.log('Ina\'nisの色彩: 支払ったホロパワー枚数が不明のため対象選択をスキップ（Xコスト未対応）');
        return;
      }
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
        // 保留2: この修正を読む消費側はまだ無い（inert）。意図の記録として付与する。
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
