/**
 * フロンティアスピリット (hBP07-100) サポート・イベント
 *
 * [サポート効果]
 *   自分のアーカイブの〈AZKi〉1枚を手札に戻す。
 *   その後、自分のアーカイブの〈フロンティアスピリット〉1枚につき、
 *   自分のアーカイブのエール1枚を自分の〈AZKi〉1人に送る。
 *   自分の〈フロンティアスピリット〉はターンに1回しか使えない。
 *
 * 実装方針:
 *   - 「ターンに1回しか使えない」は名称指定の制限。oncePerTurnUsed/markOncePerTurn で実装。
 *   - 前段: アーカイブの〈AZKi〉（名称一致）を1枚選んで手札に戻す（いなければスキップ）。
 *   - 後段: アーカイブの〈フロンティアスピリット〉の枚数ぶん、
 *     アーカイブのエール1枚をステージの〈AZKi〉1人へ送る処理を繰り返す。
 *     ※この処理時点でプレイ中のこのカード自身はまだアーカイブにいないため、枚数に数えない。
 *     ※送り先〈AZKi〉やアーカイブのエールが尽きたら、可能な分だけ送って終了する。
 */
export default {
  number: 'hBP07-100',
  support: {
    canUse(ctx) {
      return !ctx.oncePerTurnUsed('hBP07-100:フロンティアスピリット');
    },
    *run(ctx) {
      ctx.markOncePerTurn('hBP07-100:フロンティアスピリット');

      // 前段: アーカイブの〈AZKi〉1枚を手札に戻す
      const azkiInArchive = ctx.player.archive.filter(
        (c) => c.kind === 'holomen' && c.name === 'AZKi');
      if (azkiInArchive.length > 0) {
        const picked = yield ctx.chooseCard({
          cards: azkiInArchive,
          title: '手札に戻す〈AZKi〉を選択（アーカイブ）',
        });
        if (picked) {
          ctx.removeFromArchive(picked);
          ctx.addToHand(picked, { reveal: false });
          ctx.log(`${ctx.player.name}: アーカイブの ${picked.name} を手札に戻した`);
        }
      }

      // 後段: アーカイブの〈フロンティアスピリット〉1枚につき、
      //       アーカイブのエール1枚を自分の〈AZKi〉1人に送る
      const fsCount = ctx.player.archive.filter(
        (c) => c.name === 'フロンティアスピリット').length;
      if (fsCount === 0) return;

      const onStageAzki = () => ctx.holomems('self', (e) => e.top.name === 'AZKi');
      if (onStageAzki().length === 0) {
        ctx.log('ステージに〈AZKi〉がいないため、エールを送れない');
        return;
      }

      for (let i = 0; i < fsCount; i++) {
        const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
        if (cheers.length === 0) break;
        const cheer = yield ctx.chooseCard({
          cards: cheers,
          title: `〈AZKi〉に送るエールを選択（アーカイブ・${i + 1}/${fsCount}）`,
        });
        if (!cheer) break;
        const entry = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => e.top.name === 'AZKi',
          title: 'エールを送る〈AZKi〉を選択',
        });
        if (!entry) break;
        ctx.removeFromArchive(cheer);
        ctx.attachCheer(cheer, entry.holomem);
      }
    },
  },
};
