/**
 * 古代武器 (hBP04-099) サポート・ツール
 * [サポート効果] 相手のターンで、付いているホロメンがダウンした時、自分の手札1枚をアーカイブできる：
 *   このツールを手札に戻す。
 *   → triggers.onDown（装着カードもダウン時に発火）で実装。ダウン処理はアーカイブ前に走るので、
 *     手札1枚アーカイブを払えば、このツールを attachments から外して手札に戻す（finish でアーカイブされない）。
 * ◆1st以上の〈アーニャ・メルフィッサ〉に付いていたら能力追加:
 *   自分のステージの〈古代武器〉1枚につき、このツールが付いているホロメンのアーツ+10。
 */
export default {
  number: 'hBP04-099',
  triggers: {
    // 相手のターンでホストがダウンした時、手札1枚をアーカイブして、この〈古代武器〉を手札に戻せる（任意）
    *onDown(ctx) {
      if (ctx.state.turnPlayer === ctx.playerIdx) return; // 相手のターン
      const self = ctx.sourceCard;       // この古代武器
      const host = ctx.sourceHolomem;    // ダウンしたホスト
      if (!self || !host || ctx.player.hand.length === 0) return;
      const ok = yield ctx.confirm('手札1枚をアーカイブして〈古代武器〉を手札に戻す？');
      if (!ok) return;
      const toArc = yield ctx.chooseCard({ cards: [...ctx.player.hand], title: 'アーカイブする手札を選択' });
      if (!toArc) return;
      ctx.removeFromHand(toArc);
      ctx.player.archive.push(toArc);
      const i = host.attachments.indexOf(self);
      if (i !== -1) { host.attachments.splice(i, 1); ctx.addToHand(self); ctx.log('〈古代武器〉を手札に戻した'); }
    },
  },
  attached: {
    artsPlus(holomem, engine) {
      const top = holomem.stack[0];
      if (top.name !== 'アーニャ・メルフィッサ') return 0;
      if (top.bloomLevel === 'Debut') return 0; // 1st以上
      const ownerIdx = engine.state.players.findIndex((p) =>
        engine._stageHolomems(p).includes(holomem));
      if (ownerIdx < 0) return 0;
      const p = engine.state.players[ownerIdx];
      let count = 0;
      for (const h of engine._stageHolomems(p)) {
        count += h.attachments.filter((a) => a.name === '古代武器').length;
      }
      return count * 10;
    },
  },
};
