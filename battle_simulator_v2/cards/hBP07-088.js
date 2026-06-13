/**
 * 虎金妃笑虎 (hBP07-088) 黄・1st #DEV_IS #FLOW #GLOW HP160
 * ギフト「虎の威」: 自分のバックポジションの #FLOW GLOW を持つ1stホロメン全員は、
 *   相手からの特殊ダメージを受けない。
 *   → auraDamageDelta（kind==='special' のみ、自分のバックの #FLOW #GLOW 1st を -∞ 軽減で無効化）
 * アーツ「みんなが居るから幸せだ！」(50+): このターンに自分のステージのエールがアーカイブされていたなら、
 *   このアーツ+30。→ ステージのエールがアーカイブされた記録（cheersArchivedFromStageThisTurn）が必要。
 *   現状そのフラグ未実装のため、+30条件は保留（ベースの50のみ）。
 */
export default {
  number: 'hBP07-088',
  // 自分のバックの #FLOW #GLOW 1st が受ける特殊ダメージを無効化（相手からのもののみ＝防御側アウラなので常に相手由来）
  auraDamageDelta(src, target, zone, engine, kind) {
    if (kind !== 'special') return 0;
    if (zone !== 'back') return 0;
    const top = target.stack[0];
    if (top.bloomLevel !== '1st') return 0;
    const tags = top.tags || [];
    if (!tags.includes('FLOW') || !tags.includes('GLOW')) return 0;
    return -1000000; // 特殊ダメージを受けない
  },
};
