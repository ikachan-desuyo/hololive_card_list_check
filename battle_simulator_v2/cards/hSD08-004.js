/**
 * 天音かなた (hSD08-004) 白・2nd・HP180（#JP #4期生 #歌）
 *
 * [キーワード/ギフト]「エンジェルウィンド」:
 *   [センターポジション限定]自分のコラボポジションの#4期生を持つDebutホロメンのアーツ+40。
 *   → auraArtsPlus（常時アウラ）で実装。かなたがセンターにいる間、コラボの#4期生Debutに+40。
 *
 * [アーツ]「きみの背中に追いつけるように」(120) 特攻: 相手が赤なら+50:
 *   [ターンに1回]このアーツで相手のセンターホロメンをダウンさせた時、
 *   相手の2ndホロメン1人に特殊ダメージ40を与える。
 *   → onDownDealt で実装。攻撃対象（=通常はセンター）がダウンした時に発火するが、
 *      テキストは「相手のセンターホロメンをダウンさせた時」なので、相手センターが
 *      実際にダウン状態（damage>=実効HP）であることを確認してから発動する。
 *      「できる」の記載なし=強制の誘発効果。相手に2ndホロメンがいれば必ず1人に40を与える。
 *      ［ターンに1回］は markOncePerTurn で制御。
 *      特攻（特殊効果アイコン 赤+50）はエンジン側のアイコン処理に委ねる。
 */
export default {
  number: 'hSD08-004',
  // キーワード「エンジェルウィンド」: [センター限定]自分のコラボの#4期生Debutのアーツ+40（常時アウラ）
  auraArtsPlus(src, holomem, engine) {
    if (engine._zoneOf(src) !== 'center') return 0;       // [センターポジション限定]（かなた自身）
    if (engine._zoneOf(holomem) !== 'collab') return 0;   // コラボポジションの
    const top = holomem.stack[0];
    if (top.bloomLevel !== 'Debut') return 0;             // Debutホロメン
    if (!(top.tags || []).includes('4期生')) return 0;    // #4期生
    return 40;
  },
  arts: {
    'きみの背中に追いつけるように': {
      // 「このアーツで相手のセンターホロメンをダウンさせた時」→ ダメージ適用後に発火
      *onDownDealt(ctx) {
        if (ctx.oncePerTurnUsed('hSD08-004-arts')) return; // [ターンに1回]
        // 相手のセンターホロメンがダウン状態（実効HP以上のダメージ）か確認
        const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
        if (!center) return;
        const centerDowned = center.holomem.damage >= ctx.engine.effectiveHp(center.holomem);
        if (!centerDowned) return;
        // 相手の2ndホロメン1人に特殊ダメージ40（強制: 2ndホロメンがいれば必ず与える）
        const targets = ctx.holomems('opp', (e) => e.top.bloomLevel === '2nd');
        if (targets.length === 0) return;
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.top.bloomLevel === '2nd',
          title: '特殊ダメージ40を与える相手の2ndホロメンを選択',
        });
        if (!target) return;
        ctx.markOncePerTurn('hSD08-004-arts');
        yield* ctx.dealSpecialDamage(target, 40);
      },
    },
  },
};
