/**
 * 猫又おかゆ (hBP05-045) 青・2nd・HP200（#ゲーマーズ）
 * アーツ「僕のコト、大好きになってみない？」(120): 相手のホロメン1人に特殊ダメージ20を与える。
 *   その後、自分のアーカイブのエール1枚を自分の#ゲーマーズを持つバックホロメンに送れる。
 * ギフト「自分らしく居られる場所」:
 *   [センターポジション限定]自分の推しホロメンの〈猫又おかゆ〉と自分のステージの〈猫又おかゆ〉全員が
 *   相手のセンターホロメンに与える特殊ダメージ+20。
 *   → 常時アウラ（auraSpecialDmgPlus）。自分(おかゆ)がセンターにいる間、
 *     発生源が〈猫又おかゆ〉で相手センターを対象とする特殊ダメージに+20。
 */
export default {
  number: 'hBP05-045',
  // [センター限定] 〈猫又おかゆ〉が相手センターに与える特殊ダメージ+20
  auraSpecialDmgPlus(src, sourceHolomem, targetEntry, engine) {
    if (engine._zoneOf(src) !== 'center') return 0;
    if (src.stack[0].name !== '猫又おかゆ') return 0;
    if (sourceHolomem?.stack[0].name !== '猫又おかゆ') return 0;
    return targetEntry.pos.zone === 'center' ? 20 : 0;
  },
  arts: {
    '僕のコト、大好きになってみない？': {
      *run(ctx) {
        const target = yield ctx.chooseHolomem({ side: 'opp', title: '特殊ダメージ20を与える相手ホロメンを選択' });
        if (target) yield* ctx.dealSpecialDamage(target, 20);
        const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
        const backs = ctx.holomems('self', (e) => e.pos.zone === 'back' && ctx.hasTag(e.top, 'ゲーマーズ'));
        if (cheers.length === 0 || backs.length === 0) return;
        const picked = yield ctx.chooseCard({
          cards: cheers, title: '送るエールを選択（アーカイブ・任意）', optional: true, skipLabel: '送らない',
        });
        if (!picked) return;
        const dest = yield ctx.chooseHolomem({
          side: 'self', filter: (e) => e.pos.zone === 'back' && ctx.hasTag(e.top, 'ゲーマーズ'),
          title: 'エールを送る #ゲーマーズ のバックホロメンを選択',
        });
        if (dest) { ctx.removeFromArchive(picked); ctx.attachCheer(picked, dest.holomem); }
      },
    },
  },
};
