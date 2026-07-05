/**
 * こぼ・かなえる (hBP01-008) 推しホロメン・青
 *
 * 推しスキル「レイン・シャーマニズム」[ホロパワー：-1][ターンに1回]:
 *   自分の青ホロメンの能力でエールをアーカイブした時に使える：相手のホロメン1人に特殊ダメージ20を与える。
 *   → onCheerArchivedOshiSkill で実装。engine の archiveCheer（能力起因）で、推しの当スキルを
 *     コスト＋発動確認付きで提示する。発生源(info.source)が青ホロメンの時のみ使える。[ターン1回]。
 *
 * SP推しスキル「雨乞い」[ホロパワー：-3][ゲームに1回]:
 *   自分のアーカイブのエール1～5枚を、自分の#IDを持つホロメンに割り振って送る。
 *   → 能動型のSP推しスキル（タイミング割り込みではない）。
 *     アーカイブのエールを1～5枚選び、1枚ずつ自分の#IDホロメンへ割り振って送る。
 *     「1～5枚」=最低1枚・最大5枚。コスト（ホロパワー-3）と「ゲームに1回」制限はエンジンが処理する。
 *     #ID ホロメンが盤面に1人もいない／アーカイブにエールが無い場合は使用不可（canUseで弾く）。
 */
const hasIdHolomem = (engine, p) =>
  engine._stagePositions(p).some((pos) => {
    const top = engine._holomemAt(p, pos).stack[0];
    return (top.tags || []).includes('ID');
  });

export default {
  number: 'hBP01-008',

  // 推しスキル「レイン・シャーマニズム」[ターン1回]: 青ホロメンの能力でエールをアーカイブした時、相手に特殊ダメージ20
  onCheerArchivedOshiSkill: {
    cost: 1,
    title: '推しスキル「レイン・シャーマニズム」: 相手のホロメン1人に特殊ダメージ20を与えますか？',
    canUse(engine, ownerIdx, info) {
      // アーカイブを起こした能力の発生源が青ホロメンであること
      return !!info.source && info.source.stack[0].color === '青';
    },
    *run(ctx) {
      if (ctx.holomems('opp').length === 0) return;
      const target = yield ctx.chooseHolomem({ side: 'opp', title: '特殊ダメージ20を与える相手のホロメンを選択' });
      if (target) yield* ctx.dealSpecialDamage(target, 20);
    },
  },

  spOshiSkill: {
    name: '雨乞い',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // アーカイブにエールが1枚以上あること
      if (!p.archive.some((c) => c.kind === 'cheer')) return false;
      // 盤面に #ID を持つホロメンが1人以上いること
      return hasIdHolomem(engine, p);
    },
    *run(ctx) {
      // アーカイブのエール1～5枚を、1枚ずつ #ID ホロメンへ割り振って送る
      for (let i = 0; i < 5; i++) {
        const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
        if (cheers.length === 0) break;
        const cheer = yield ctx.chooseCard({
          cards: cheers,
          title: `#IDホロメンに送るエールをアーカイブから選択 (${i + 1}/5枚目)`,
          // 1枚目は必須、2枚目以降は任意（「1～5枚」のため最低1枚）
          optional: i > 0,
          skipLabel: 'ここまでにする',
        });
        if (!cheer) break;
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => (e.top.tags || []).includes('ID'),
          title: 'エールを送る#IDホロメンを選択',
        });
        if (!target) break;
        ctx.removeFromArchive(cheer);
        ctx.attachCheer(cheer, target.holomem);
      }
    },
  },
};
