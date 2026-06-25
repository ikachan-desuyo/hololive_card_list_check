/**
 * 儒烏風亭らでん (hBP04-002) 推しホロメン・緑
 * 推しスキル「ReGLOSSの風流人」[ホロパワー：-2][ターンに1回]:
 *   自分のアーカイブのエール1枚を、自分の#ReGLOSSを持つホロメンに送る。
 *   → 能動型推しスキル。アーカイブにエールがあり、かつ盤面に#ReGLOSSホロメンがいる時のみ使える。
 * SP推しスキル「余った時間でぐるぐる」[ホロパワー：-2][ゲームに1回]:
 *   自分のアーカイブの#きのこを持つイベント1～4枚を手札に戻す。
 *   そして手札に戻したカード2枚につき、自分のデッキを1枚引く。
 *   → 「1～4枚」=最低1枚・最大4枚。ドローは戻した枚数÷2の端数切り捨て（2枚→1ドロー, 3枚→1ドロー, 4枚→2ドロー）。
 *     コスト（ホロパワー-2）と使用回数制限はエンジンが処理する。
 *
 * 保留: なし
 */
const isReglossHolomem = (e) => (e.top.tags || []).includes('ReGLOSS');

const isKinokoEvent = (c) =>
  c.kind === 'support' && c.supportType === 'イベント' && (c.tags || []).includes('きのこ');

export default {
  number: 'hBP04-002',

  oshiSkill: {
    name: 'ReGLOSSの風流人',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // アーカイブにエールが1枚以上あること
      if (!p.archive.some((c) => c.kind === 'cheer')) return false;
      // 盤面に#ReGLOSSを持つホロメンが1人以上いること
      return engine._stagePositions(p).some((pos) =>
        (engine._holomemAt(p, pos).stack[0].tags || []).includes('ReGLOSS'));
    },
    *run(ctx) {
      const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
      if (cheers.length === 0) return;
      const cheer = yield ctx.chooseCard({
        cards: cheers,
        title: '#ReGLOSSホロメンに送るエールをアーカイブから選択',
      });
      if (!cheer) return;
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: isReglossHolomem,
        title: 'エールを送る#ReGLOSSホロメンを選択',
      });
      if (!target) return;
      ctx.removeFromArchive(cheer);
      ctx.attachCheer(cheer, target.holomem);
    },
  },

  spOshiSkill: {
    name: '余った時間でぐるぐる',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // アーカイブに#きのこイベントが1枚以上あること
      return p.archive.some(isKinokoEvent);
    },
    *run(ctx) {
      // アーカイブの#きのこイベント1～4枚を手札に戻す（「1～4枚」=最低1枚・最大4枚）
      const events = ctx.player.archive.filter(isKinokoEvent);
      const picked = yield ctx.chooseCards({
        cards: events,
        min: 1,
        max: 4,
        title: '手札に戻す#きのこイベントをアーカイブから選択（1～4枚）',
      });
      for (const c of picked) {
        ctx.removeFromArchive(c);
        ctx.addToHand(c);
      }
      const returned = picked.length;
      // 手札に戻したカード2枚につき1枚引く（端数切り捨て）
      const drawCount = Math.floor(returned / 2);
      if (drawCount > 0) {
        ctx.log(`手札に戻した${returned}枚につき${drawCount}枚ドロー`);
        ctx.draw(drawCount);
      }
    },
  },
};
