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
      // アーカイブの#きのこイベント1～4枚を手札に戻す
      let returned = 0;
      for (let i = 0; i < 4; i++) {
        const events = ctx.player.archive.filter(isKinokoEvent);
        if (events.length === 0) break;
        const picked = yield ctx.chooseCard({
          cards: events,
          title: `手札に戻す#きのこイベントをアーカイブから選択 (${i + 1}/4枚目)`,
          // 1枚目は必須、2枚目以降は任意（「1～4枚」のため最低1枚）
          optional: i > 0,
          skipLabel: 'ここまでにする',
        });
        if (!picked) break;
        ctx.removeFromArchive(picked);
        ctx.addToHand(picked);
        returned++;
      }
      // 手札に戻したカード2枚につき1枚引く（端数切り捨て）
      const drawCount = Math.floor(returned / 2);
      if (drawCount > 0) {
        ctx.log(`手札に戻した${returned}枚につき${drawCount}枚ドロー`);
        ctx.draw(drawCount);
      }
    },
  },
};
