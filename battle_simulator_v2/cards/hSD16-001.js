/**
 * さくらみこ (hSD16-001) 推しホロメン・赤
 *
 * 推しスキル「35Pこっちこっちー」[ホロパワー：-2][ターンに1回]:
 *   自分の〈35P〉が付いているホロメンがいるなら、自分のデッキを1枚引く。
 *   → oshiSkill（能動）。自分のステージのホロメンに〈35P〉（名前一致のファン）が
 *     1枚でも付いていれば使え、デッキを1枚引く。対象選択は無い。
 *     ※コスト[ホロパワー：-2]と[ターンに1回]はエンジン側が処理するため run には書かない。
 *
 * SP推しスキル「35Pいくぞー！」[ホロパワー：-2][ゲームに1回]:
 *   自分のファンが付いている〈さくらみこ〉1人を選ぶ。このターンの間、選んだホロメンのアーツ+50。
 *   → spOshiSkill（能動）。ファン（supportType==='ファン'）が付いた〈さくらみこ〉（名前一致）を
 *     1人選び、そのホロメン限定で「このターンの間アーツ+50」のターン修正を付与する。
 *     match は選んだホロメン実体に一致（ブルーム/移動しても同じスタックを追う）。
 *     ※コスト[ホロパワー：-2]と[ゲームに1回]はエンジン側が処理するため run には書かない。
 *
 * 保留: なし（全効果実装済み）。
 */

// 〈35P〉が付いているか（〈35P〉はファンカードだが、ここは名前一致で厳密判定）
const has35P = (holomem) => holomem.attachments.some((a) => a.name === '35P');

// ファン（supportType==='ファン'）が付いている〈さくらみこ〉か
const isMikoWithFan = (e) =>
  e.top && e.top.name === 'さくらみこ' &&
  e.holomem.attachments.some((a) => a.supportType === 'ファン');

export default {
  number: 'hSD16-001',

  oshiSkill: {
    name: '35Pこっちこっちー',
    canUse(engine, ownerIdx) {
      // 自分のステージに〈35P〉が付いているホロメンがいる時のみ使える
      const p = engine.state.players[ownerIdx];
      return engine._stageHolomems(p).some((h) => has35P(h));
    },
    *run(ctx) {
      // 条件を満たしていればデッキを1枚引く（対象選択なし）
      const ok = ctx.engine._stageHolomems(ctx.player).some((h) => has35P(h));
      if (!ok) return;
      ctx.draw(1);
    },
  },

  spOshiSkill: {
    name: '35Pいくぞー！',
    canUse(engine, ownerIdx) {
      // ファンが付いている〈さくらみこ〉が1人以上いる時のみ使える
      const p = engine.state.players[ownerIdx];
      return engine._stageHolomems(p).some(
        (h) => h.stack[0] && h.stack[0].name === 'さくらみこ' &&
          h.attachments.some((a) => a.supportType === 'ファン'));
    },
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: isMikoWithFan,
        title: 'アーツ+50する〈さくらみこ〉（ファンが付いている）を選択',
      });
      if (!entry) return;
      const target = entry.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 50,
        ownerIdx: ctx.playerIdx,
        match: (h) => h === target,
        description: `このターンの間、${target.stack[0].name}のアーツ+50`,
      });
    },
  },
};
