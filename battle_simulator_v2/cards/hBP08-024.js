/**
 * セシリア・イマーグリーン (hBP08-024) 緑・1st・HP170（#EN,#Justice,#語学）
 *
 * ギフト「グーテ・ライゼ -良き旅を-」:
 *   [センターポジション・コラボポジション限定]相手のメインステップの間、
 *   自分のお休みしている〈セシリア・イマーグリーン〉全員のHPは相手の能力で減らず、変動しない。
 *   → 常時アウラ（auraDamageDelta）。発生源(src=このホロメン)がセンター/コラボにいる間、
 *     相手のメインステップ中（相手ターンの main ステップ＝アーツは出ず能力ダメージのみ）に、
 *     自分のお休みしている〈セシリア・イマーグリーン〉が受けるダメージを0にする(-100000)。
 *     _auraSum は持ち主のステージのみ走査するため、対象は自然に「自分の」ホロメンに限定される。
 *     hBP04-024（自己センター限定版）の拡張: 対象は src 自身に限らず、
 *     名前が〈セシリア・イマーグリーン〉でお休み中のホロメン全員。
 *
 * アーツ「風の赴くままに」(dmg:60 / 緑):
 *   このホロメンをお休みさせる。
 *   → アーツ run でこのホロメン(ctx.sourceHolomem)を rested=true にする。ダメージ適用後に実行される。
 *
 * 保留: なし（全て context.js / aura 機構のプリミティブで実装）。
 */
export default {
  number: 'hBP08-024',
  auraDamageDelta(src, target, zone, engine) {
    // [センター・コラボ限定] 発生源(このセシリア)がセンター/コラボにいる時のみ有効
    const srcZone = engine._zoneOf(src);
    if (srcZone !== 'center' && srcZone !== 'collab') return 0;
    // 相手のメインステップの間のみ
    const s = engine.state;
    if (s.step !== 'main') return 0;
    const owner = engine.state.players.findIndex((p) => engine._stageHolomems(p).includes(target));
    if (owner < 0 || s.turnPlayer === owner) return 0; // 「相手の」メインステップ（持ち主のターンでない）
    // 対象: 自分のお休みしている〈セシリア・イマーグリーン〉全員
    if (!target.rested) return 0;
    if (target.stack?.[0]?.name !== 'セシリア・イマーグリーン') return 0;
    return -100000; // 相手の能力で減らず、変動しない
  },
  arts: {
    '風の赴くままに': {
      *run(ctx) {
        // このホロメンをお休みさせる
        if (ctx.sourceHolomem && !ctx.sourceHolomem.rested) {
          ctx.sourceHolomem.rested = true;
          ctx.log(`${ctx.sourceHolomem.stack[0].name} をお休みさせた`);
        }
      },
    },
  },
};
