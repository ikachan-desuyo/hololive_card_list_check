/**
 * 古石ビジュー (hSD12-011) 紫・2nd・HP200（#EN #Advent #ベイビー）
 *
 * ブルームエフェクト「ビブーと遊んでいかない？」:
 *   自分のデッキを1枚引く。その後、自分のステージのエール1枚をアーカイブできる。
 *   アーカイブしたなら、自分のステージのホロメン1人を選ぶ。
 *   このターンの間、選んだホロメンのアーツ+40。
 *
 * アーツ「キラキラぜーんぶ受け止めて！」(110):
 *   お互いのアーカイブのエール1色につき、このアーツに必要な無色-1。
 *   → 両者のアーカイブにあるエールの色（重複を除いた色数）だけ、このホロメンのアーツ必要無色を軽減する。
 *      常時効果なので artsCostReduceAura で実装（このホロメン自身のコストにのみ作用）。
 */

/** 両者のアーカイブにあるエールの「色」を重複なしで数える（無色エールは色なしとして除外） */
function bothArchiveCheerColorCount(engine) {
  const colors = new Set();
  for (const p of engine.state.players) {
    for (const card of p.archive) {
      if (card.kind === 'cheer' && card.color && card.color !== '無色') {
        colors.add(card.color);
      }
    }
  }
  return colors.size;
}

export default {
  number: 'hSD12-011',
  bloomEffect: {
    name: 'ビブーと遊んでいかない？',
    *run(ctx) {
      ctx.draw(1);
      // 自分のステージ上の全エールを集める（ホロメンとの対応も保持）
      const stageCheers = [];
      for (const { holomem } of ctx.holomems('self')) {
        for (const cheer of holomem.cheers) {
          stageCheers.push({ cheer, holomem });
        }
      }
      if (stageCheers.length === 0) return;
      const ok = yield ctx.confirm('自分のステージのエール1枚をアーカイブしますか？（アーカイブしたホロメン1人がこのターン アーツ+40）');
      if (!ok) return;
      const pick = yield ctx.chooseCard({
        cards: stageCheers.map((s) => s.cheer),
        title: 'アーカイブするステージのエールを選択',
      });
      if (!pick) return;
      const entry = stageCheers.find((s) => s.cheer === pick);
      ctx.archiveCheer(entry.holomem, pick);
      // アーカイブしたなら、ステージのホロメン1人にこのターン アーツ+40
      const target = yield ctx.chooseHolomem({
        side: 'self',
        title: 'このターン アーツ+40 するホロメンを選択',
      });
      if (!target) return;
      const chosen = target.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 40,
        ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターン、${chosen.stack[0].name} のアーツ+40`,
      });
    },
  },
  arts: {
    'キラキラぜーんぶ受け止めて！': {
      // ダメージ修正・追加効果なし。コスト軽減は下の artsCostReduceAura で処理する。
    },
  },
  // 「お互いのアーカイブのエール1色につき、このアーツに必要な無色-1」
  // このホロメン自身のアーツコストにのみ作用させる（src === target のときだけ軽減を返す）。
  artsCostReduceAura(src, target, engine) {
    if (src !== target) return [];
    const n = bothArchiveCheerColorCount(engine);
    if (n <= 0) return [];
    return [{ color: '無色', amount: n }];
  },
};
