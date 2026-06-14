/**
 * 猫又おかゆ (hBP02-041) 青・1st・HP230・Buzzホロメン（#JP #ゲーマーズ #ケモミミ #歌）
 * アーツ「ぽいずん猫」(50):
 *   このホロメンの青エール1枚をアーカイブできる：
 *   相手のセンターホロメンとバックホロメン1人に特殊ダメージ20を与える。
 *   → arts.run でコスト（青エール1枚アーカイブ）を支払い、特殊ダメージを与える。
 *
 * キーワード/ギフト「毒の愛」:
 *   [センターポジション限定]自分のステージの〈猫又おかゆ〉全員が相手のセンターホロメンに
 *   与える特殊ダメージ+20。
 *   → auraSpecialDmgPlus（常時アウラ）で実装。このおかゆがセンターにいる間、〈猫又おかゆ〉が
 *     相手のセンターに与える特殊ダメージ+20（system.js specialDamageBonus が集計）。
 */
export default {
  number: 'hBP02-041',
  // キーワード「毒の愛」: [センター限定]〈猫又おかゆ〉が相手センターに与える特殊ダメージ+20
  auraSpecialDmgPlus(src, sourceHolomem, targetEntry, engine) {
    if (engine._zoneOf(src) !== 'center') return 0;               // [センター限定]（キーワード保持者）
    if (sourceHolomem.stack[0].name !== '猫又おかゆ') return 0;     // 〈猫又おかゆ〉が与える特殊
    const tgt = targetEntry?.holomem;
    if (!tgt || engine._zoneOf(tgt) !== 'center') return 0;        // 相手のセンターに
    const srcOwner = engine.state.players.findIndex((p) => engine._stageHolomems(p).includes(src));
    const tgtOwner = engine.state.players.findIndex((p) => engine._stageHolomems(p).includes(tgt));
    if (srcOwner < 0 || tgtOwner < 0 || srcOwner === tgtOwner) return 0; // 相手のセンター（自分のではない）
    return 20;
  },
  arts: {
    'ぽいずん猫': {
      *run(ctx) {
        // コスト: このホロメンの青エール1枚をアーカイブできる（任意）
        const blues = ctx.sourceHolomem.cheers.filter((c) => c.color === '青');
        if (blues.length === 0) return;
        const ok = yield ctx.confirm('青エール1枚をアーカイブして特殊ダメージを与えますか？');
        if (!ok) return;
        const cheer = yield ctx.chooseCard({ cards: blues, title: 'アーカイブする青エールを選択' });
        if (!cheer) return;
        yield* ctx.archiveCheer(ctx.sourceHolomem, cheer);
        // 相手のセンターホロメンに特殊ダメージ20
        const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
        if (center) yield* ctx.dealSpecialDamage(center, 20);
        // 相手のバックホロメン1人に特殊ダメージ20
        const backs = ctx.holomems('opp', (e) => e.pos.zone === 'back');
        if (backs.length > 0) {
          const target = yield ctx.chooseHolomem({
            side: 'opp', filter: (e) => e.pos.zone === 'back',
            title: '特殊ダメージ20を与える相手のバックホロメンを選択',
          });
          if (target) yield* ctx.dealSpecialDamage(target, 20);
        }
      },
    },
  },
};
