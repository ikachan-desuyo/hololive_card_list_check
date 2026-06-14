/**
 * 姫森ルーナ (hBP06-030) 緑・1st・HP180（#JP,#4期生,#ベイビー）
 * アーツ「届けたいのら！」(20):
 *   自分のアーカイブの〈ルーナイト〉1枚を自分の〈姫森ルーナ〉に付けられる。
 *   （付け先は「他の」指定が無いので、このホロメン自身も対象になりうる。
 *    ツール/マスコット上限・付け先ルールを尊重して _canAttachSupport で絞る。）
 *
 * ギフト「みんなへ感謝の気持ち」:
 *   [コラボポジション限定]相手のターンで、自分のセンターホロメンに付いている〈ルーナイト〉を
 *   アーカイブする時、アーカイブするかわりに自分のバックの〈姫森ルーナ〉に付け替えられる。
 *   → attachArchiveReplace で実装。ダウン処理 finish のアーカイブ直前に
 *     engine._replaceAttachArchiveGen が自ステージのギフトを提示する。
 *     ※「アーカイブする時」＝センターホロメンのダウン時に装着カードがアーカイブされる場面を対象とする。
 */
export default {
  number: 'hBP06-030',
  arts: {
    '届けたいのら！': {
      *run(ctx) {
        const knights = ctx.player.archive.filter((c) => c.name === 'ルーナイト');
        if (knights.length === 0) return;
        const picked = yield ctx.chooseCard({
          cards: knights,
          title: '付ける〈ルーナイト〉を選択（アーカイブ・任意）',
          optional: true,
          skipLabel: '付けない',
        });
        if (!picked) return;
        const targets = ctx.holomems('self', (e) =>
          e.top.name === '姫森ルーナ' && ctx.engine._canAttachSupport(e.holomem, picked));
        if (targets.length === 0) return;
        const dest = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => e.top.name === '姫森ルーナ' && ctx.engine._canAttachSupport(e.holomem, picked),
          title: '〈ルーナイト〉を付ける〈姫森ルーナ〉を選択',
        });
        if (!dest) return;
        ctx.removeFromArchive(picked);
        // アーカイブから付けるので「付けた時」トリガーも誘発させる
        yield* ctx.attachSupportWithTrigger(picked, dest.holomem);
      },
    },
  },

  // ギフト「みんなへ感謝の気持ち」: 装着〈ルーナイト〉のアーカイブをバックの〈姫森ルーナ〉への付け替えに差し替える
  attachArchiveReplace: {
    title: 'ギフト「みんなへ感謝の気持ち」: 〈ルーナイト〉をアーカイブするかわりにバックの〈姫森ルーナ〉に付け替えますか？',
    canUse(engine, ownerIdx, { downedPos, attachment, giftHolomem }) {
      if (engine._zoneOf(giftHolomem) !== 'collab') return false;   // [コラボポジション限定]
      if (engine.state.turnPlayer === ownerIdx) return false;       // 相手のターンで
      if (downedPos.zone !== 'center') return false;                // 自分のセンターホロメンに付いている
      if (attachment.name !== 'ルーナイト') return false;            // 〈ルーナイト〉
      // 付け替え先: バックの〈姫森ルーナ〉が居て、付けられること
      const p = engine.state.players[ownerIdx];
      return p.back.some((e) => e.stack[0].name === '姫森ルーナ' && engine._canAttachSupport(e, attachment));
    },
    *run(ctx, { attachment }) {
      const dest = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.pos.zone === 'back' && e.top.name === '姫森ルーナ'
          && ctx.engine._canAttachSupport(e.holomem, attachment),
        title: `${attachment.name} を付け替えるバックの〈姫森ルーナ〉を選択`,
      });
      return dest ? dest.holomem : null;
    },
  },
};
