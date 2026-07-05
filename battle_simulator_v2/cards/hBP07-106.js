/**
 * ハトタウロス (hBP07-106) サポート・マスコット（#白上'sキャラクター）
 *
 * [サポート効果] このマスコットが付いているホロメンのHP+20。
 *   → attached.hpPlus で実装。
 *
 * ◆〈大神ミオ〉に付いていたら能力追加
 *   このホロメンがコラボした時、このホロメンに付いている〈ハトタウロス〉1枚をデッキの上に
 *   戻せる：自分のアーカイブのホロメン1枚を手札に戻す。
 *   → triggers.onCollab で実装。ホストが〈大神ミオ〉のとき、コスト（このハトタウロスをデッキの上へ戻す）を
 *     払えば、アーカイブのホロメン1枚を手札に戻す（任意）。
 *
 * マスコットは自分のホロメン1人につき1枚だけ付けられる（エンジン既定のマスコット制限で処理）。
 */
export default {
  number: 'hBP07-106',
  attached: {
    // [サポート効果] 付いているホロメンのHP+20
    hpPlus() { return 20; },
  },
  triggers: {
    // ◆〈大神ミオ〉に付いていたら: ホストがコラボした時、このハトタウロスをデッキの上に戻して、アーカイブのホロメン1枚を手札に戻す（任意）
    * onCollab(ctx) {
      const host = ctx.sourceHolomem;
      if (host?.stack[0].name !== '大神ミオ') return;
      const self = ctx.sourceCard; // このハトタウロス
      if (!self) return;
      const archived = ctx.player.archive.filter((c) => c.kind === 'holomen');
      if (archived.length === 0) return; // 戻すホロメンが無ければ意味がない
      const ok = yield ctx.confirm('ハトタウロスをデッキの上に戻して、アーカイブのホロメン1枚を手札に戻す？');
      if (!ok) return;
      // コスト: このハトタウロスをデッキの上に戻す
      const i = host.attachments.indexOf(self);
      if (i === -1) return;
      host.attachments.splice(i, 1);
      ctx.player.deck.unshift(self);
      // アーカイブのホロメン1枚を手札に戻す
      const picked = yield ctx.chooseCard({
        cards: ctx.player.archive.filter((c) => c.kind === 'holomen'),
        title: 'アーカイブから手札に戻すホロメンを選択',
      });
      if (picked) { ctx.removeFromArchive(picked); ctx.addToHand(picked); }
    },
  },
};
