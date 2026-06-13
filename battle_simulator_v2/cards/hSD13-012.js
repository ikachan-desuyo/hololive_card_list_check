/**
 * ジジ・ムリン (hSD13-012)
 * ギフト「ご苦労さん！」: 相手のターンで、自分のバックホロメンが相手から特殊ダメージを受ける時、
 *   このホロメンに重なっているホロメン1枚をアーカイブできる：このターンの間、自分のバックホロメン全員は
 *   特殊ダメージを受けない。
 *   → onDamageReceivedReact（特殊ダメージ限定の割り込み）。発動時：このホロメンのスタック下のホロメン1枚を
 *     アーカイブし、ターン修正 damageReceivedDelta(特殊・自分のバック・-∞) を積む＋この打点も0にする。
 * アーツ「負けるわけにはいかない」: テキスト効果なし。
 */
export default {
  number: 'hSD13-012',
  onDamageReceivedReact: {
    title: '重なっているホロメン1枚をアーカイブして、このターン自分のバックを特殊ダメージ無効に？',
    yesLabel: 'アーカイブする（バック全員 特殊ダメージ無効）',
    canUse(engine, info) {
      if (info.kind !== 'special') return false;                 // 特殊ダメージのみ
      if (engine.state.turnPlayer === info.defIdx) return false;  // 相手のターンのみ
      if (engine._zoneOf(info.target) !== 'back') return false;   // 受け手が自分のバック
      // このホロメン（reactor）に重なっているホロメンが1枚以上あること
      return (info.reactor?.stack?.length || 0) >= 2;
    },
    apply(engine, info) {
      // 重なっているホロメン1枚（スタックの一番下）をアーカイブ
      const reactor = info.reactor;
      const archived = reactor.stack.pop();
      engine.state.players[info.defIdx].archive.push(archived);
      engine.log(`${reactor.stack[0].name}: 重なっている${archived.name}をアーカイブ → このターン自分のバックは特殊ダメージを受けない`);
      // このターンの間、自分のバックホロメン全員は特殊ダメージを受けない
      engine.state.modifiers.push({
        duration: 'turn', kind: 'damageReceivedDelta', ownerIdx: info.defIdx,
        matchKind: 'special', match: (h, zone) => zone === 'back', amount: -1000000,
        description: '自分のバックは特殊ダメージを受けない',
      });
      return 0; // この打点も無効
    },
  },
};
