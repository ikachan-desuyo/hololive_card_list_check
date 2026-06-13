/**
 * 天音かなた (hBP01-001) 推しホロメン・白
 *
 * 推しスキル「ぎゅっぎゅっ」[ホロパワー：-3][ターンに1回]:
 *   相手のセンターホロメンの残りHPを50にする。
 *   → oshiSkill（能動）。残りHP = effectiveHp - damage。これを 50 にするので
 *     damage = effectiveHp - 50（0未満にはしない）。テキストどおり「50にする」ので、
 *     残りHPが50以下のセンターには damage を増やさない（HPは下げるだけの効果ではあるが、
 *     「50にする」=設定であるため、現状以下にする処理のみ行い回復はしない）。
 *     ※コスト[ホロパワー：-3]はエンジン側が処理するため run には書かない。
 *
 * SP推しスキル「握りつぶしちゃうぞ」[ホロパワー：-2][ゲームに1回]:
 *   このターンの間、自分のホロメン1人のアーツ+50。そのホロメンの色が白の時、さらに、そのアーツ+50。
 *   → spOshiSkill（能動）。選んだホロメンに artsPlus のターン修正を付与。白なら合計+100。
 */
export default {
  number: 'hBP01-001',
  oshiSkill: {
    name: 'ぎゅっぎゅっ',
    canUse(engine, ownerIdx) {
      const opp = engine.state.players[1 - ownerIdx];
      // 相手のセンターがいて、残りHPが50より大きい場合のみ意味がある
      if (!opp.center) return false;
      const remaining = engine.effectiveHp(opp.center) - opp.center.damage;
      return remaining > 50;
    },
    *run(ctx) {
      const opp = ctx.opponent;
      if (!opp.center) return;
      const center = opp.center;
      const hp = ctx.engine.effectiveHp(center);
      const newDamage = Math.max(0, hp - 50);
      if (newDamage > center.damage) {
        center.damage = newDamage;
        ctx.log(`${center.stack[0].name} の残りHPを50にした（累計${center.damage}/${hp}）`);
      }
    },
  },
  spOshiSkill: {
    name: '握りつぶしちゃうぞ',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // 自分のホロメンが1人でもいれば使える
      return engine._stageHolomems(p).length > 0;
    },
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        title: 'このターン アーツ+50（白ならさらに+50）するホロメンを選択',
      });
      if (!entry) return;
      const chosen = entry.holomem;
      const isWhite = entry.top.color === '白';
      const amount = isWhite ? 100 : 50;
      ctx.addTurnModifier({
        kind: 'artsPlus', amount, ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターンの間、${chosen.stack[0].name} のアーツ+${amount}`,
      });
    },
  },
};
