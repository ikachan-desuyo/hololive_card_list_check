/**
 * 夏色まつり (hBP07-084) 黄・2nd・HP210（JP・1期生・シューター）
 *
 * アーツ「やっぱり、FPSとか？」(90, 特攻: 青+50):
 *   自分のアーカイブのエール1枚を自分のホロメンに送る。
 *   → arts.run で実装（hBP02-019 と同じパターン）。
 *
 * ギフト「一緒にゲームしよ」（未実装）:
 *   相手のターンでこのホロメンがダウンした時、自分のアーカイブのLIMITEDのサポートカード1枚を
 *   デッキの下に戻せる。戻したなら、このホロメンをアーカイブするかわりに手札に戻す。
 *   → 主目的は「ダウンしたホロメンをアーカイブするかわりに手札に戻す」だが、
 *      エンジンの _processDown はダウン処理で必ずアーカイブする実装で、
 *      「アーカイブのかわりに手札に戻す」機構が存在しない（バウンス機構が未対応）。
 *      条件部（LIMITEDサポートをデッキ下へ）は手書き可能だが、それ単体ではプレイヤーに
 *      不利益しか与えず、本来の効果（手札に戻す）と切り離して実装するのは不正確なため保留。
 */
export default {
  number: 'hBP07-084',
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
