/**
 * 天音かなた (hSD08-004) 白・2nd・HP180（#JP #4期生 #歌）
 *
 * [キーワード/ギフト]「エンジェルウィンド」:
 *   [センターポジション限定]自分のコラボポジションの#4期生を持つDebutホロメンのアーツ+40。
 *   → 別のホロメン（コラボの#4期生Debut）を恒常強化する常時アウラのため【保留】。
 *      （規約の「他ホロメンを恒常強化する常時アウラ」に該当。attached.artsPlus は
 *       自分自身/装着先の修正であって、別ホロメンを参照して強化する機構が無い）
 *
 * [アーツ]「きみの背中に追いつけるように」(120) 特攻: 相手が赤なら+50:
 *   [ターンに1回]このアーツで相手のセンターホロメンをダウンさせた時、
 *   相手の2ndホロメン1人に特殊ダメージ40を与える。
 *   → onDownDealt で実装。攻撃対象（=通常はセンター）がダウンした時に発火するが、
 *      テキストは「相手のセンターホロメンをダウンさせた時」なので、相手センターが
 *      実際にダウン状態（damage>=実効HP）であることを確認してから発動する。
 *      ［ターンに1回］は markOncePerTurn で制御。
 *      特攻（特殊効果アイコン 赤+50）はエンジン側のアイコン処理に委ねる。
 */
export default {
  number: 'hSD08-004',
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
        // 相手の2ndホロメン1人に特殊ダメージ40
        const targets = ctx.holomems('opp', (e) => e.top.bloomLevel === '2nd');
        if (targets.length === 0) return;
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.top.bloomLevel === '2nd',
          title: '特殊ダメージ40を与える相手の2ndホロメンを選択',
          optional: true,
        });
        if (!target) return;
        ctx.markOncePerTurn('hSD08-004-arts');
        yield* ctx.dealSpecialDamage(target, 40);
      },
    },
  },
};
