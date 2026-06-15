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
 *   - 後段: アーカイブの〈フロンティアスピリット〉の枚数ぶん、アーカイブのエールを
 *     ステージの〈AZKi〉「1人」へまとめて送る。送り先は最初に1人だけ確定し、
 *     全エールを同じ〈AZKi〉へ送る（「〈AZKi〉1人に送る」＝複数人に分けて送れない）。
 *     ※この処理時点でプレイ中のこのカード自身はまだアーカイブにいないため、枚数に数えない。
 *     ※アーカイブのエールが尽きたら、可能な分だけ送って終了する。
 */
export default {
  number: 'hBP07-100',
  support: {
    canUse(ctx) {
      // #魔法… ではなく「〈フロンティアスピリット〉はターンに1回しか使えない」
      if (ctx.oncePerTurnUsed('hBP07-100:フロンティアスピリット')) return false;
      const p = ctx.player;
      // 効果が何か起きる時だけプレイ可能（一般ルールQ348）:
      //  ① アーカイブに〈AZKi〉がいて手札に戻せる、または
      //  ② アーカイブの〈フロンティアスピリット〉≥1 ＋ アーカイブのエール≥1 ＋ ステージに〈AZKi〉（エールを送れる）
      const canReturnAzki = p.archive.some((c) => c.kind === 'holomen' && c.name === 'AZKi');
      const canSendCheer = p.archive.some((c) => c.name === 'フロンティアスピリット')
        && p.archive.some((c) => c.kind === 'cheer')
        && ctx.holomems('self', (e) => e.top.name === 'AZKi').length > 0;
      return canReturnAzki || canSendCheer;
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

      if (ctx.holomems('self', (e) => e.top.name === 'AZKi').length === 0) {
        ctx.log('ステージに〈AZKi〉がいないため、エールを送れない');
        return;
      }

      // 送り先〈AZKi〉は「1人」だけ先に確定し、全エールを同じ〈AZKi〉へ送る（複数人に分けない）
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.top.name === 'AZKi',
        title: 'エールを送る〈AZKi〉1人を選択',
      });
      if (!target) return;

      for (let i = 0; i < fsCount; i++) {
        const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
        if (cheers.length === 0) break;
        const cheer = yield ctx.chooseCard({
          cards: cheers,
          title: `〈${target.top.name}〉に送るエールを選択（アーカイブ・${i + 1}/${fsCount}）`,
        });
        if (!cheer) break;
        ctx.removeFromArchive(cheer);
        ctx.attachCheer(cheer, target.holomem);
      }
    },
  },
};
