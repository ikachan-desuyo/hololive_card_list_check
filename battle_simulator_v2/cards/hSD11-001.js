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
 *   → 「#FLOW GLOWホロメンの能力でエールをアーカイブした時」を監視して発火する
 *     タイミング割り込み型の推しスキル。エンジン側に「エールがアーカイブされた時」の
 *     監視機構が無いため未実装（保留）。
 */
const hasFlowGlowEmpty = (engine, p) =>
  engine._stagePositions(p).some((pos) => {
    const h = engine._holomemAt(p, pos);
    return (h.stack[0].tags || []).includes('FLOW GLOW') && h.cheers.length === 0;
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
        filter: (e) => ctx.hasTag(e.top, 'FLOW GLOW') && e.holomem.cheers.length === 0,
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

  // SP推しスキル「ニコたんの名を呼ぶがいいさ！」はエールアーカイブ時のタイミング割り込み型のため未実装（保留）
};
