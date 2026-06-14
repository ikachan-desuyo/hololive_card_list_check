/**
 * 夏色まつり (hBP07-084) 黄・2nd・HP210（JP・1期生・シューター）
 *
 * アーツ「やっぱり、FPSとか？」(90, 特攻: 青+50):
 *   自分のアーカイブのエール1枚を自分のホロメンに送る。
 *   → arts.run で実装（hBP02-019 と同じパターン）。
 *
 * ギフト「一緒にゲームしよ」:
 *   相手のターンでこのホロメンがダウンした時、自分のアーカイブのLIMITEDのサポートカード1枚を
 *   デッキの下に戻せる。戻したなら、このホロメンをアーカイブするかわりに手札に戻す。
 *   → triggers.onDown で実装。ダウン処理はアーカイブ前に走るので、コスト（アーカイブのLIMITED
 *     サポート1枚をデッキ下へ）を払えば、このホロメンのスタックを手札へ移す（finish はアーカイブしない）。
 */
export default {
  number: 'hBP07-084',
  triggers: {
    // ギフト「一緒にゲームしよ」: 相手のターンでダウンした時、アーカイブのLIMITEDサポートをデッキ下に戻して、このホロメンを手札に戻す（任意）
    *onDown(ctx) {
      if (ctx.state.turnPlayer === ctx.playerIdx) return; // 相手のターン
      const downed = ctx.sourceHolomem;
      const limiteds = ctx.player.archive.filter((c) => c.kind === 'support' && c.limited);
      if (limiteds.length === 0) return;
      const picked = yield ctx.chooseCard({ cards: limiteds, title: 'アーカイブのLIMITEDサポート1枚をデッキの下に戻して、このホロメンを手札に戻す？（任意）', optional: true });
      if (!picked) return;
      ctx.removeFromArchive(picked);
      ctx.player.deck.push(picked); // デッキの下に戻す
      // このホロメンをアーカイブするかわりに手札に戻す（スタックを手札へ。finish はアーカイブしない）
      const cards = [...downed.stack];
      downed.stack.length = 0;
      for (const c of cards) ctx.addToHand(c);
      ctx.log('夏色まつり「一緒にゲームしよ」: アーカイブするかわりに手札に戻した');
    },
  },
  arts: {
    'やっぱり、FPSとか？': {
      *run(ctx) {
        const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
        if (cheers.length === 0) return;
        const picked = yield ctx.chooseCard({
          cards: cheers,
          title: 'アーカイブから送るエールを選択',
        });
        if (!picked) return;
        const target = yield ctx.chooseHolomem({
          side: 'self',
          title: 'エールを送るホロメンを選択',
        });
        if (target) {
          ctx.removeFromArchive(picked);
          ctx.attachCheer(picked, target.holomem);
        }
      },
    },
  },
};
