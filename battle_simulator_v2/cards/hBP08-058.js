/**
 * フワワ・アビスガード (hBP08-058) 青・2nd・HP200（#EN #Advent #ケモミミ）
 *
 * アーツ「勝てるわけないでしょ！」(dmg:100):
 *   自分のアーカイブの青エール1～2枚を選び、自分の#Adventを持つホロメンに割り振って送る。
 *   → テキスト効果（アーツ解決後 run）。アーカイブの「青」エールを 1枚ずつ選び、
 *     その都度送り先の自分の#Adventホロメンを選ぶ（別々のホロメンに割り振れる）。
 *     「1～2枚」=最低1枚・最大2枚。アーカイブに青エールが無い／#Adventホロメンが
 *     いない場合は何もしない（dmg自体はエンジンが処理）。
 *
 * アーツ「今度はこっちの番だよ！」(dmg:160):
 *   自分の推しホロメンが青の〈FUWAMOCO〉なら、このホロメンのエール2枚をアーカイブできる:
 *   相手のDebut以外のホロメン1人に特殊ダメージ50を与える。
 *   → 追加効果（任意「できる」）。発動条件: 推しが 青の FUWAMOCO で、このホロメンに
 *     エールが2枚以上付いていて、対象（相手のDebut以外のホロメン）が1人以上いること。
 *     コスト: このホロメンのエール2枚をアーカイブ（プレイヤーがどのエールを払うか選ぶ）。
 *     効果: 相手のDebut以外（=1st/2nd/推し等、bloomLevel!=='Debut'）のホロメン1人に特殊ダメージ50。
 *
 * 保留: なし（全文 context.js のプリミティブで実装）。
 */

// このアーツの追加効果（推し条件＋エール2枚アーカイブ）が発動可能か
function canUseExtra(ctx) {
  const oshi = ctx.player.oshi;
  if (!oshi || oshi.name !== 'FUWAMOCO' || oshi.color !== '青') return false;
  // このホロメンにエールが2枚以上付いている
  if (!ctx.sourceHolomem || (ctx.sourceHolomem.cheers || []).length < 2) return false;
  // 対象: 相手のDebut以外のホロメンが1人以上
  return ctx.holomems('opp', (e) => e.top.bloomLevel !== 'Debut').length > 0;
}

export default {
  number: 'hBP08-058',
  arts: {
    '勝てるわけないでしょ！': {
      *run(ctx) {
        // アーカイブの青エール1～2枚を、1枚ずつ#Adventホロメンへ割り振って送る
        for (let i = 0; i < 2; i++) {
          const blueCheers = ctx.player.archive.filter(
            (c) => c.kind === 'cheer' && c.color === '青');
          if (blueCheers.length === 0) break;
          // 送り先の#Adventホロメンがいなければ終了
          if (ctx.holomems('self', (e) => ctx.hasTag(e.top, '#Advent')).length === 0) break;
          const cheer = yield ctx.chooseCard({
            cards: blueCheers,
            title: `#Adventホロメンに送る青エールをアーカイブから選択 (${i + 1}/2枚目)`,
            optional: i > 0, // 1枚目は必須、2枚目は任意（「1～2枚」）
            skipLabel: 'ここまでにする',
          });
          if (!cheer) break;
          const target = yield ctx.chooseHolomem({
            side: 'self',
            filter: (e) => ctx.hasTag(e.top, '#Advent'),
            title: '青エールを送る#Adventホロメンを選択',
          });
          if (!target) break;
          ctx.removeFromArchive(cheer);
          ctx.attachCheer(cheer, target.holomem);
        }
      },
    },
    '今度はこっちの番だよ！': {
      *run(ctx) {
        if (!canUseExtra(ctx)) return;
        const use = yield ctx.confirm(
          'このホロメンのエール2枚をアーカイブして、相手のDebut以外のホロメン1人に特殊ダメージ50を与える？',
          'エール2枚をアーカイブして発動', '発動しない');
        if (!use) return;

        // コスト: このホロメンのエール2枚をアーカイブ（払うエールをプレイヤーが選ぶ）
        const src = ctx.sourceHolomem;
        for (let i = 0; i < 2; i++) {
          const cheers = src.cheers || [];
          if (cheers.length === 0) return; // 念のため（canUseで2枚以上は保証済み）
          const cheer = yield ctx.chooseCard({
            cards: cheers,
            title: `アーカイブするエールを選択 (${i + 1}/2枚)`,
          });
          if (!cheer) return;
          yield* ctx.archiveCheer(src, cheer);
        }

        // 効果: 相手のDebut以外のホロメン1人に特殊ダメージ50
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.top.bloomLevel !== 'Debut',
          title: '特殊ダメージ50を与える相手のDebut以外のホロメンを選択',
        });
        if (!target) return;
        yield* ctx.dealSpecialDamage(target, 50);
      },
    },
  },
};
