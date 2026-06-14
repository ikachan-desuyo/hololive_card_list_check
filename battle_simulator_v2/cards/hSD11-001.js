/**
 * 虎金妃笑虎 (hSD11-001) 推しホロメン・黄
 *
 * 推しスキル「虎視眈々」[ホロパワー：-2][ターンに1回]:
 *   自分のアーカイブのエール1～2枚を、自分のエールが付いていない#FLOW GLOWを持つホロメン1人に送る。
 *   → 能動型の推しスキル（タイミング割り込みではない）。実装可。
 *     対象は「エールが付いていない」=cheers.length===0 の #FLOW GLOW ホロメン1人。
 *     その1人に対してアーカイブのエールを1～2枚（最低1枚・最大2枚）送る。
 *     コスト[ホロパワー：-2]と[ターンに1回]制限はエンジンが処理するため run には書かない。
 *     ※対象を先に確定させ、同じ1人へ1～2枚送る（テキスト「ホロメン1人に送る」）。
 *
 * SP推しスキル「ニコたんの名を呼ぶがいいさ！」[ホロパワー：-2][ゲームに1回]:
 *   自分の#FLOW GLOWを持つホロメンの能力でエールをアーカイブした時に使える：
 *   相手のセンターホロメンかコラボホロメンどちらかに、アーカイブしたエール1枚につき特殊ダメージ30を与える。
 *   → onCheerArchivedBatchOshiSkill で実装。エンジンは効果実行(ctx)ごとに archiveCheer の枚数を集計し、
 *     効果完了時に1回だけこのSP推しスキルを提示する（info.count=その能力で捨てた枚数）。
 *     「#FLOW GLOWホロメンの能力で」の発生源判定は canUse で info.source（=ctx.sourceHolomem）を見る。
 */
// #FLOW GLOW はタグが 'FLOW' と 'GLOW' に分割格納されるため両方を確認する
const isFlowGlow = (top) => !!top && (top.tags || []).includes('FLOW') && (top.tags || []).includes('GLOW');
const hasFlowGlowEmpty = (engine, p) =>
  engine._stagePositions(p).some((pos) => {
    const h = engine._holomemAt(p, pos);
    return isFlowGlow(h.stack[0]) && h.cheers.length === 0;
  });

export default {
  number: 'hSD11-001',

  oshiSkill: {
    name: '虎視眈々',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // アーカイブにエールが1枚以上あること
      if (!p.archive.some((c) => c.kind === 'cheer')) return false;
      // 盤面に「エールが付いていない#FLOW GLOW」ホロメンが1人以上いること
      return hasFlowGlowEmpty(engine, p);
    },
    *run(ctx) {
      // 送り先（エールが付いていない#FLOW GLOWホロメン1人）を先に確定
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => isFlowGlow(e.top) && e.holomem.cheers.length === 0,
        title: 'エールを送る#FLOW GLOWホロメン1人を選択（エールが付いていない）',
      });
      if (!target) return;
      // アーカイブのエール1～2枚を、その1人へ送る
      for (let i = 0; i < 2; i++) {
        const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
        if (cheers.length === 0) break;
        const cheer = yield ctx.chooseCard({
          cards: cheers,
          title: `${target.holomem.stack[0].name} に送るエールをアーカイブから選択 (${i + 1}/2枚目)`,
          // 1枚目は必須、2枚目は任意（「1～2枚」のため最低1枚）
          optional: i > 0,
          skipLabel: 'ここまでにする',
        });
        if (!cheer) break;
        ctx.removeFromArchive(cheer);
        ctx.attachCheer(cheer, target.holomem);
      }
    },
  },

  // SP推しスキル「ニコたんの名を呼ぶがいいさ！」[ホロパワー：-2][ゲームに1回]:
  //   自分の#FLOW GLOWホロメンの能力でエールをアーカイブした時に使える：
  //   相手のセンターorコラボに、アーカイブしたエール1枚につき特殊30。
  onCheerArchivedBatchOshiSkill: {
    cost: 2,
    sp: true,
    title: 'SP推しスキル「ニコたんの名を呼ぶがいいさ！」を使いますか？',
    canUse(engine, ownerIdx, info) {
      // 発生源が自分のステージ上の#FLOW GLOWホロメンであること
      const src = info.source;
      if (!src || !src.stack || !isFlowGlow(src.stack[0])) return false;
      if (!engine._stageHolomems(engine.state.players[ownerIdx]).includes(src)) return false;
      // 相手にセンターorコラボが居ること（与える対象が必要）
      const opp = engine.state.players[1 - ownerIdx];
      return !!opp.center || !!opp.collab;
    },
    *run(ctx) {
      const count = ctx.cheerArchivedInfo?.count || 0;
      if (count <= 0) return;
      const target = yield ctx.chooseHolomem({
        side: 'opp',
        filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'collab',
        title: `特殊ダメージ${30 * count}を与える相手のセンターorコラボを選択（エール${count}枚×30）`,
      });
      if (!target) return;
      yield* ctx.dealSpecialDamage(target, 30 * count);
    },
  },
};
