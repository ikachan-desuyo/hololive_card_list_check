/**
 * 大神ミオ (hBP07-029) 緑・2nd・HP200（#JP #ゲーマーズ #ケモミミ #料理）
 *
 * [キーワード/ギフト]「緑の地母神」:
 *   [ターンに1回]相手のターンで、このホロメンがダメージを受けた時、
 *   このホロメンにサポートカードが付いているなら、このホロメンのHP50回復。
 *   → onDamageReceivedForced（カード定義の被ダメージ後トリガー・同期）で実装。engine が
 *     「相手のターンに被弾した後」に発火する。サポートが付いていれば [ターンに1回] HP50回復
 *     （ダメージカウンタを最大50戻す）。
 *
 * [アーツ]「Upright Leading」(130+ / 特攻 黄+50):
 *   自分のデッキの上から1枚をアーカイブできる。
 *   アーカイブしたカードがホロメンなら、自分のエールデッキの上から1枚を自分のホロメンに送る。
 *   サポートカードなら、このアーツ+50。
 *   → 実装済み。
 */
export default {
  number: 'hBP07-029',
  // キーワード「緑の地母神」: [ターンに1回]相手のターンに被弾後、サポートが付いていればHP50回復
  onDamageReceivedForced(holomem, engine, ownerIdx) {
    const key = 'hBP07-029:heal';
    const used = engine.state.modifiers.some(
      (m) => m.kind === 'oncePerTurnUsed' && m.key === key && m.ownerIdx === ownerIdx);
    if (used) return;
    if (holomem.attachments.length === 0) return; // サポートカードが付いているなら
    engine.state.modifiers.push({ duration: 'turn', kind: 'oncePerTurnUsed', key, ownerIdx });
    const before = holomem.damage;
    holomem.damage = Math.max(0, holomem.damage - 50);
    if (holomem.damage !== before) {
      engine.log(`大神ミオ「緑の地母神」: HP50回復（ダメージ ${before} → ${holomem.damage}）`);
    }
  },
  arts: {
    'Upright Leading': {
      *run(ctx) {
        if (ctx.player.deck.length === 0) return;
        const ok = yield ctx.confirm('デッキの上から1枚をアーカイブしますか？');
        if (!ok) return;
        const card = ctx.player.deck.shift();
        ctx.player.archive.push(card);
        ctx.recordDeckArchive(1);
        ctx.log(`${ctx.player.name}: デッキの上の ${card.name} をアーカイブ`);
        ctx.flashReveal(card); // 何をアーカイブしたか画面に見せる
        if (card.kind === 'holomen') {
          // ホロメンなら、エールデッキの上から1枚を自分のホロメンに送る
          const target = yield ctx.chooseHolomem({
            side: 'self',
            title: 'エールを送る自分のホロメンを選択',
          });
          if (target) ctx.sendCheerFromCheerDeckTop(target.holomem);
        } else if (card.kind === 'support') {
          // サポートカードなら、このアーツ+50
          ctx.addArtBonus(50, 'アーカイブしたカードがサポート');
        }
        // それ以外（エール）は追加効果なし
      },
    },
  },
};
