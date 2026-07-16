/**
 * 獅白ぼたん (hBP03-002) 推しホロメン・緑
 *
 * 推しスキル「poi」[ホロパワー：-2][ターンに1回]:
 *   自分のアーカイブのエール1枚を、自分のバックホロメンの〈獅白ぼたん〉に送る。
 *   → メインステップの能動推しスキル。アーカイブのエール → バックの〈獅白ぼたん〉へエールを送る。
 *     コスト（ホロパワー-2）とターン制限はエンジンが処理するので run では扱わない。
 *
 * SP推しスキル「狙撃」[ホロパワー：-2][ゲームに1回]:
 *   自分のセンターホロメンの色が緑の時に使える：
 *   相手のDebut以外のセンターホロメンに特殊ダメージ100を与える。
 *   → 能動型のSP推しスキル（タイミング割り込みではない）。
 *     「ゲームに1回」制限はエンジンが処理する。
 *     ※相手センターがDebutの場合・存在しない場合は対象不在のため使用不可（canUseで弾く）。
 *
 * 「〈獅白ぼたん〉」はカード名参照。バックの「獅白ぼたん」という名前のホロメンが対象。
 */
const BOTAN_NAME = '獅白ぼたん';

export default {
  number: 'hBP03-002',

  oshiSkill: {
    name: 'poi',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // アーカイブにエールが1枚以上あること
      const hasArchiveCheer = p.archive.some((c) => c.kind === 'cheer');
      if (!hasArchiveCheer) return false;
      // バックに〈獅白ぼたん〉がいること
      return engine._stagePositions(p).some((pos) => {
        if (pos.zone !== 'back') return false;
        return engine._holomemAt(p, pos).stack[0].name === BOTAN_NAME;
      });
    },
    *run(ctx) {
      const archiveCheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
      if (archiveCheers.length === 0) return;
      const cheer = yield ctx.chooseCard({
        cards: archiveCheers,
        title: 'バックの〈獅白ぼたん〉に送るエールをアーカイブから選択',
      });
      if (!cheer) return;
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.pos.zone === 'back' && e.top.name === BOTAN_NAME,
        title: 'エールを送るバックの〈獅白ぼたん〉を選択',
      });
      if (!target) return;
      // アーカイブから取り除いて対象ホロメンへ送る
      ctx.removeFromArchive(cheer);
      ctx.attachCheer(cheer, target.holomem);
    },
  },

  spOshiSkill: {
    name: '狙撃',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // 自分のセンターホロメンの色が緑
      if (!p.center || !engine._hasColor(p.center, '緑')) return false;
      // 相手のDebut以外のセンターホロメンが存在すること
      const opp = engine.state.players[1 - ownerIdx];
      if (!opp.center) return false;
      return opp.center.stack[0].bloomLevel !== 'Debut';
    },
    *run(ctx) {
      const target = ctx.holomems('opponent', (e) =>
        e.pos.zone === 'center' && e.top.bloomLevel !== 'Debut')[0];
      if (!target) return;
      yield* ctx.dealSpecialDamage(target, 100);
    },
  },
};
