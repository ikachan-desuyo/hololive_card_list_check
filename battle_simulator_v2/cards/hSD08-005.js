/**
 * 姫森ルーナ (hSD08-005) 白・Debut
 * ギフト「なんでも入る巾着」: [コラボポジション限定]相手のターンで、自分のホロメンがダウンした時、
 *   自分のライフが相手以下なら、自分のアーカイブのカード名に「パソコン」を含むアイテム1枚を手札に戻せる。
 *   → triggers.onAnyDown（任意の自ホロメンのダウンを監視）
 * アーツ「お祭りなのら」(30): テキスト効果なし。
 */
export default {
  number: 'hSD08-005',
  triggers: {
    *onAnyDown(ctx) {
      if (ctx.state.turnPlayer === ctx.playerIdx) return;          // 相手のターン
      if (ctx.sourceHolomemPos()?.zone !== 'collab') return;       // [コラボ限定]
      if (ctx.downedInfo?.ownerIdx !== ctx.playerIdx) return;      // 自分のホロメンがダウン
      if (ctx.player.life.length > ctx.opponent.life.length) return; // 自ライフが相手以下
      const cand = ctx.player.archive.filter((c) =>
        c.kind === 'support' && c.supportType === 'アイテム' && c.name.includes('パソコン'));
      if (cand.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: cand, title: '手札に戻す「パソコン」アイテムを選択（任意）', optional: true, skipLabel: '戻さない',
      });
      if (picked) { ctx.removeFromArchive(picked); ctx.addToHand(picked, { reveal: false }); }
    },
  },
};
