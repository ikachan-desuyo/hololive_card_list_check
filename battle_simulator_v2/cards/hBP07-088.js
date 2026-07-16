/**
 * 虎金妃笑虎 (hBP07-088) 黄・1st #DEV_IS #FLOW #GLOW HP160
 * ギフト「虎の威」: 自分のバックポジションの #FLOW GLOW を持つ1stホロメン全員は、
 *   相手からの特殊ダメージを受けない。
 *   → auraDamageDelta（kind==='special' のみ、自分のバックの #FLOW #GLOW 1st を -∞ 軽減で無効化）
 *   ※「相手から」の限定: 発生源ホロメン(attacker)が対象と同じ持ち主なら自分の効果由来
 *     （hBP07-102 角巻わためのハンマー等）なので無効化しない。attacker 不明時は相手由来とみなす。
 * アーツ「みんなが居るから幸せだ！」(50+): このターンに自分のステージのエールがアーカイブされていたなら、
 *   このアーツ+30。→ ctx.player.cheerArchivedThisTurn（archiveCheer で記録、ターン開始でリセット）を参照。
 */
export default {
  number: 'hBP07-088',
  // 自分のバックの #FLOW #GLOW 1st が受ける「相手から」の特殊ダメージを無効化
  auraDamageDelta(src, target, zone, engine, kind, attacker) {
    if (kind !== 'special') return 0;
    if (zone !== 'back') return 0;
    const top = target.stack[0];
    if (top.bloomLevel !== '1st') return 0;
    const tags = top.tags || [];
    if (!tags.includes('FLOW') || !tags.includes('GLOW')) return 0;
    // 「相手から」: 発生源ホロメンが対象と同じ持ち主なら自分の効果由来なので防がない（hBP07-102 等）
    if (attacker && engine.effects._ownerOf(attacker) === engine.effects._ownerOf(target)) return 0;
    return -1000000; // 相手からの特殊ダメージを受けない
  },
  arts: {
    'みんなが居るから幸せだ！': {
      // このターンに自分のステージのエールがアーカイブされていたなら +30
      dmgBonus(ctx) {
        return ctx.player.cheerArchivedThisTurn ? 30 : 0;
      },
    },
  },
};
