/**
 * じゃあ敵だね（サポート・イベント・LIMITED）
 * 相手のセンターホロメンとバックホロメン1人を交代させる。
 */
export default {
  number: 'hBP01-108',
  ai: {
    // じゃあ敵だねはタイミングが重要なLIMITED。「相手バックを引き出して“今ターン倒せる”時だけ使う」のが正解
    // （主力2ndを引きずり出して恒久除去＝バックは普段殴れないので価値大）。倒せないなら温存＝パス以下にして無駄打ちを防ぐ
    // （倒せもしないのにチップのために消費し、相手の育った前衛をバックへ逃がしてしまう、を避ける）。
    supportValue({ engine, player }) {
      const idx = engine.state.players[0] === player ? 0 : 1;
      const opp = engine.state.players[1 - idx];
      if (!opp?.center || !(opp.back && opp.back.length)) return -10;
      // 自分の前衛(センター+コラボ)が今払える最大火力の合計＝センターへ引き出した相手を倒せるか
      const reach = [player.center, player.collab].filter(Boolean).reduce((s, h) => {
        let d = 0;
        for (const a of (h.stack[0].arts || [])) {
          if (engine._canPayCheers(h.cheers, a.cost)) d = Math.max(d, engine._artEffectiveDamage(h, a, idx));
        }
        return s + d;
      }, 0);
      let best = -10; // 引き出して倒せる相手バックが無ければ温存（使わない）
      for (const h of opp.back) {
        if (!h) continue;
        const remain = engine.effectiveHp(h) - h.damage;
        const threat = Math.max(0, ...(h.stack[0].arts || []).map((a) => a.dmg || 0));
        if (remain > 0 && reach >= remain) best = Math.max(best, 55 + threat * 0.1); // 倒せる→脅威(主力2nd)ほど高評価
      }
      return best;
    },
  },
  support: {
    canUse(ctx) {
      return !!ctx.opponent.center && ctx.opponent.back.length > 0;
    },
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'opp',
        filter: (e) => e.pos.zone === 'back',
        title: '相手のセンターと交代させるバックホロメンを選択',
      });
      if (!entry) return;
      const opp = ctx.opponent;
      const i = entry.pos.index;
      const center = opp.center;
      opp.center = opp.back[i];
      opp.back[i] = center;
      ctx.log(`${opp.center.stack[0].name} が相手のセンターに移動（交代）`);
    },
  },
};
