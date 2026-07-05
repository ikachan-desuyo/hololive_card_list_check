/**
 * 大空スバル (hSD19-001) 推しホロメン・黄
 *
 * 推しスキル「ごめんｹﾄﾞ」[ホロパワー：-3][ターンに1回]:
 *   自分のアーカイブのホロメン1枚を手札に戻す。
 *   → oshiSkill（能動）。アーカイブのホロメンカード1枚を選んで手札に戻す。
 *     アーカイブにホロメンが無ければ使えない。
 *     ※コスト[ホロパワー：-3]と[ターンに1回]はエンジン側が処理するため run には書かない。
 *
 * SP推しスキル「おさんぽスバル」[ホロパワー：-2][ゲームに1回]:
 *   自分のアーカイブのエールを自分の〈大空スバル〉1～2人に1枚ずつ送る。
 *   → spOshiSkill（能動）。アーカイブのエールを、自分のステージの〈大空スバル〉（名前一致）
 *     1～2人に、それぞれ1枚ずつ送る（各ホロメンには1枚のみ。最低1人・最大2人）。
 *     対象の〈大空スバル〉が居ない、またはアーカイブにエールが無ければ使えない。
 *     ※コスト[ホロパワー：-2]と[ゲームに1回]はエンジン側が処理するため run には書かない。
 *
 * 保留: なし（全効果実装済み）。
 */

// 自分のステージの〈大空スバル〉か（名前一致）
const isSubaru = (e) => e.top && e.top.name === '大空スバル';

export default {
  number: 'hSD19-001',

  oshiSkill: {
    name: 'ごめんｹﾄﾞ',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      return p.archive.some((c) => c.kind === 'holomen');
    },
    *run(ctx) {
      const cand = ctx.player.archive.filter((c) => c.kind === 'holomen');
      if (cand.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: cand,
        title: '手札に戻すホロメンをアーカイブから選択',
      });
      if (!picked) return;
      ctx.removeFromArchive(picked);
      ctx.addToHand(picked);
    },
  },

  spOshiSkill: {
    name: 'おさんぽスバル',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      const hasSubaru = engine._stageHolomems(p).some(
        (h) => h.stack[0] && h.stack[0].name === '大空スバル');
      const hasCheer = p.archive.some((c) => c.kind === 'cheer');
      return hasSubaru && hasCheer;
    },
    *run(ctx) {
      // 〈大空スバル〉1～2人に、アーカイブのエールを1枚ずつ送る（各1枚・別ホロメン）
      const chosen = []; // 既に送ったホロメンの実体（重複選択を防ぐ）
      for (let i = 0; i < 2; i++) {
        const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
        if (cheers.length === 0) break;
        // まだエールを送っていない〈大空スバル〉を選ぶ
        const entry = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => isSubaru(e) && !chosen.includes(e.holomem),
          title: `エールを送る〈大空スバル〉を選択（${i + 1}人目）`,
          optional: i > 0, // 1人目は必須、2人目は任意（「1～2人」=最低1人）
        });
        if (!entry) break;
        const cheer = yield ctx.chooseCard({
          cards: cheers,
          title: `${entry.top.name} に送るエールをアーカイブから選択`,
        });
        if (!cheer) break;
        ctx.removeFromArchive(cheer);
        ctx.attachCheer(cheer, entry.holomem);
        chosen.push(entry.holomem);
      }
    },
  },
};
